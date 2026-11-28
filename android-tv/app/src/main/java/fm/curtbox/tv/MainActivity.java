package fm.curtbox.tv;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.SharedPreferences;
import android.content.res.ColorStateList;
import android.content.pm.ApplicationInfo;
import android.graphics.Color;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.view.inputmethod.EditorInfo;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;
import java.net.URI;
import java.util.Locale;

/** TV host for a user-selected Curtbox server; it never runs a game server locally. */
public final class MainActivity extends Activity {
    private static final int BG = Color.rgb(13,17,23);
    private static final int PANEL = Color.rgb(22,27,34);
    private static final int FG = Color.rgb(230,237,243);
    private static final int MUTED = Color.rgb(145,156,169);
    private static final int PURPLE = Color.rgb(137,87,229);
    private SharedPreferences prefs;
    private LinearLayout root;
    private WebView web;
    private String serverOrigin;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
        prefs = getSharedPreferences("curtbox_tv", MODE_PRIVATE);
        String saved = prefs.getString("server", "");
        if (saved == null || saved.isEmpty()) showSetup(); else showPresenter(saved);
    }

    private int dp(int px) { return Math.round(px * getResources().getDisplayMetrics().density); }
    private TextView text(String message, int sp, int color) {
        TextView t = new TextView(this);
        t.setText(message); t.setTextSize(sp); t.setTextColor(color);
        return t;
    }
    private Button button(String name) {
        Button b = new Button(this);
        b.setAllCaps(false); b.setText(name); b.setTextColor(FG); b.setTextSize(18);
        b.setFocusable(true);
        b.setBackgroundTintList(new ColorStateList(
                new int[][] { new int[] {android.R.attr.state_focused}, new int[] {} },
                new int[] { PURPLE, PANEL }));
        return b;
    }
    private void reset() {
        if (web != null) { web.stopLoading(); web.destroy(); web = null; }
        root = new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(BG); setContentView(root);
    }

    /** Only server origins; not arbitrary URLs with credentials, fragments or room paths. */
    private static String normalize(String input) {
        try {
            URI uri = new URI(input.trim());
            String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
            if (!"http".equals(scheme) && !"https".equals(scheme)) return null;
            if (uri.getHost() == null || uri.getRawUserInfo() != null || uri.getRawQuery() != null
                    || uri.getRawFragment() != null || uri.getPort() == 0 || uri.getPort() > 65535) return null;
            String path = uri.getRawPath();
            if (path != null && !path.isEmpty() && !"/".equals(path)) return null;
            return scheme + "://" + uri.getHost().toLowerCase(Locale.ROOT)
                    + (uri.getPort() < 0 ? "" : ":" + uri.getPort());
        } catch (Exception e) { return null; }
    }
    private static boolean sameOrigin(String base, String candidate) {
        try {
            URI a = new URI(base), b = new URI(candidate);
            if (b.getRawUserInfo() != null) return false;
            if (!a.getScheme().equalsIgnoreCase(b.getScheme())
                    || !a.getHost().equalsIgnoreCase(b.getHost())) return false;
            int aPort = a.getPort() >= 0 ? a.getPort() : ("https".equalsIgnoreCase(a.getScheme()) ? 443 : 80);
            int bPort = b.getPort() >= 0 ? b.getPort() : ("https".equalsIgnoreCase(b.getScheme()) ? 443 : 80);
            return aPort == bPort;
        } catch (Exception e) { return false; }
    }
    private void showSetup() {
        reset(); serverOrigin = null;
        ScrollView scroll = new ScrollView(this);
        root.addView(scroll, new LinearLayout.LayoutParams(-1,-1));
        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        content.setPadding(dp(65), dp(35), dp(65), dp(35));
        scroll.addView(content);
        content.addView(text("◈ CURTBOX TV", 39, FG));
        TextView subtitle = text("Configure your Curtbox server to create and host games from your TV.", 22, MUTED);
        LinearLayout.LayoutParams sp = new LinearLayout.LayoutParams(-1,-2);
        sp.setMargins(0,dp(18),0,dp(30)); content.addView(subtitle,sp);
        content.addView(text("SERVER URL",16,FG));
        EditText address = new EditText(this);
        address.setSingleLine(true); address.setTextSize(24);
        address.setTextColor(FG); address.setHintTextColor(MUTED);
        address.setHint("https://curtbox.example.com");
        address.setInputType(android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_VARIATION_URI);
        address.setImeOptions(EditorInfo.IME_ACTION_GO);
        address.setText(prefs.getString("server",""));
        content.addView(address, new LinearLayout.LayoutParams(-1,dp(67)));
        TextView info = text("Use HTTPS for Internet-facing servers. HTTP is only for a trusted local network.", 16, MUTED);
        LinearLayout.LayoutParams ip = new LinearLayout.LayoutParams(-1,-2);
        ip.setMargins(0,dp(10),0,dp(26)); content.addView(info,ip);
        Button connect = button("Connect & open Curtbox");
        content.addView(connect, new LinearLayout.LayoutParams(dp(460),dp(62)));
        View.OnClickListener submit = v -> {
            String normalized = normalize(address.getText().toString());
            if (normalized == null) {
                address.setError("Enter http(s)://host[:port] without a path");
                address.requestFocus(); return;
            }
            prefs.edit().putString("server", normalized).apply();
            showPresenter(normalized);
        };
        connect.setOnClickListener(submit);
        address.setOnEditorActionListener((v,id,event)-> {
            if (id == EditorInfo.IME_ACTION_GO) { submit.onClick(address); return true; }
            return false;
        });
        address.requestFocus();
    }
    private void showPresenter(String origin) {
        reset(); serverOrigin = origin;
        // Give the hosted presentation the entire screen. The native URL,
        // Reload and Server toolbar used too much of a 720p TV viewport.
        // Both actions remain available in the remote's Back/Menu dialog.
        web = new WebView(this);
        web.setBackgroundColor(BG);
        web.setFocusable(true);
        web.setFocusableInTouchMode(true);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setUserAgentString(settings.getUserAgentString()+" CurtboxTV/1.0");
        CookieManager.getInstance().setAcceptCookie(true);
        WebView.setWebContentsDebuggingEnabled((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0);
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (sameOrigin(serverOrigin,request.getUrl().toString())) return false;
                Toast.makeText(MainActivity.this,"External navigation blocked",Toast.LENGTH_SHORT).show();
                return true;
            }
            @Override public void onPageFinished(WebView view,String url) {
                view.requestFocus();
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) Toast.makeText(MainActivity.this,
                        "Curtbox connection failed — check network and server",Toast.LENGTH_LONG).show();
            }
        });
        root.addView(web,new LinearLayout.LayoutParams(-1,-1));
        web.loadUrl(origin+"/");
        web.requestFocus();
    }

    /** The native actions are accessible without a permanently visible toolbar. */
    private void exitMenu() {
        new AlertDialog.Builder(this).setTitle("Curtbox TV")
                .setItems(new String[]{"Continue hosting","Reload presentation","Change server","Exit Curtbox TV"},
                        (d,which)->{
                            if(which==1&&web!=null)web.reload();
                            else if(which==2)confirmChangeServer();
                            else if(which==3)finish();
                        })
                .show();
    }
    private void confirmChangeServer() {
        new AlertDialog.Builder(this)
                .setTitle("Change Curtbox server?")
                .setMessage("This TV will leave the current presentation. Players and rooms on that server remain unchanged.")
                .setNegativeButton("Cancel",null)
                .setPositiveButton("Change server",(d,w)->showSetup())
                .show();
    }
    @Override public void onBackPressed() {
        if (web == null) { exitMenu(); return; }
        web.evaluateJavascript("(function(){return !!(window.__curtboxTv && window.__curtboxTv.back && window.__curtboxTv.back());})()",result->{
            if(!"true".equals(result))exitMenu();
        });
    }
    @Override public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_MENU) { exitMenu(); return true; }
        return super.onKeyDown(keyCode,event);
    }
    @Override public void onDestroy() {
        if (web != null) { web.stopLoading(); web.destroy(); web=null; }
        super.onDestroy();
    }
}
