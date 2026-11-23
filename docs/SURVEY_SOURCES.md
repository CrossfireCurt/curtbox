# Survey Show — curated culture & human-behavior question bank

**302 sourced percentage questions + 2 finale sets (172 original curated + 130 newly added).** These replace the older generic survey seed for new deployments.

## Editorial criteria

- Questions must invite conversation: social etiquette, odd habits, food arguments, relationships, game night, cinema, holiday traditions, pets, superstition, and behavior.
- Avoid boring demographic permutations, platform adoption, political or economic statistics, and repetitive formulations.
- Write short, direct, party-friendly percentage prompts (usually 8–18 words; allow 6–25 when useful). Do not pad prompts to reach an arbitrary minimum.
- Never begin with “According to…” or embed filler such as “in a YouGov poll” or “when surveyed.” Keep publisher and publication year in the answer-reveal source attribution.
- Preserve essential qualifiers and timeframe in the playable question when they materially affect the meaning, even if that makes a prompt longer.
- Favor funny, familiar culture and human behavior over dry demographic breakdowns or generalized statistics.
- Transcribe only percentages stated in the linked publisher article. Do not invent or reverse percentages by subtraction.
- Keep family/standard/adults ratings; sensitive or mature items require a higher rating.
- Survey article summaries are not always verbatim questionnaire text. The seed marks missing original wording explicitly; any wording-dependent ambiguity should trigger further editorial review.
- YouGov often uses a weighted opt-in panel. Do not misdescribe its samples as probability-recruited Pew samples.
- If survey fields are missing, report them honestly rather than inventing them.

## Published source register

| Topic key | Questions | Publisher | Year | Article |
|---|---:|---|---:|---|
| foodfight | 13 | YouGov | 2025 | [Primary publisher report](https://yougov.com/en-us/articles/53202-accounting-for-taste-12-food-fights-that-split-americans) |
| pizza | 10 | YouGov | 2023 | [Primary publisher report](https://yougov.com/en-us/articles/45715-americans-favorite-pizza-topping-pepperoni-poll) |
| meals | 8 | YouGov | 2025 | [Primary publisher report](https://yougov.com/en-us/articles/51523-most-americans-watch-tv-during-dinner-41-percent-talk-to-people-they-are-with-poll) |
| holidayEtiquette | 10 | YouGov | 2024 | [Primary publisher report](https://yougov.com/en-us/articles/51192-holiday-etiquette-how-americans-handle-gifts-gatherings-and-greetings) |
| holidayStress | 5 | YouGov | 2024 | [Primary publisher report](https://yougov.com/en-us/articles/51193-holiday-celebrations-start-too-early-and-expectations-are-too-high) |
| games | 8 | YouGov | 2026 | [Primary publisher report](https://yougov.com/en-us/articles/54943-what-americans-think-about-board-games) |
| manners | 6 | YouGov | 2024 | [Primary publisher report](https://yougov.com/en-us/articles/49425-minding-their-manners-do-americans-follow-traditional-dining-etiquette) |
| friends | 7 | Pew Research Center | 2023 | [Primary publisher report](https://www.pewresearch.org/short-reads/2023/10/12/what-does-friendship-look-like-in-america/) |
| pets | 5 | YouGov | 2022 | [Primary publisher report](https://yougov.com/en-us/articles/42697-dogs-cats-pets-meaningful-role-lives-americans) |
| phone | 6 | YouGov | 2024 | [Primary publisher report](https://yougov.com/en-us/articles/49124-phone-etiquette-what-americans-deem-acceptable-behavior-on-calls) |
| movie | 9 | YouGov | 2024 | [Primary publisher report](https://yougov.com/en-us/articles/50978-americans-rules-for-movie-theater-etiquette) |
| laundry | 6 | YouGov | 2025 | [Primary publisher report](https://yougov.com/en-us/articles/52696-how-americans-wash-their-clothes) |
| dating | 7 | YouGov | 2025 | [Primary publisher report](https://yougov.com/en-us/articles/51519-how-often-do-americans-go-on-dates) |
| couples | 7 | YouGov | 2026 | [Primary publisher report](https://yougov.com/en-us/articles/54096-what-do-couples-argue-about-tone-of-voice-communication-styles-and-money-top-the-list) |
| paranormal | 12 | YouGov | 2025 | [Primary publisher report](https://yougov.com/en-us/articles/53258-most-americans-say-they-have-experienced-at-least-one-paranormal-event) |
| aliens | 6 | YouGov | 2025 | [Primary publisher report](https://yougov.com/en-us/articles/53486-half-of-americans-believe-aliens-have-visited-earth) |
| chores | 6 | YouGov | 2026 | [Primary publisher report](https://yougov.com/en-us/articles/54180-how-americans-feel-about-household-chores-and-dividing-them) |
| foodDelivery | 6 | YouGov | 2026 | [Primary publisher report](https://yougov.com/en-us/articles/54098-food-delivery-takeout-cooking) |
| horror | 5 | YouGov | 2025 | [Primary publisher report](https://yougov.com/en-us/articles/53195-the-horror-divide-americans-love-hate-relationship-with-scary-movies) |
| rudeness | 8 | Pew Research Center | 2024 | [Primary publisher report](https://www.pewresearch.org/short-reads/2025/03/12/almost-half-of-americans-say-people-have-gotten-ruder-since-the-covid-19-pandemic/) |
| superstition | 4 | YouGov | 2022 | [Primary publisher report](https://yougov.com/en-us/articles/42425-which-superstitions-are-americans-most-likely-beli) |
| awkward | 7 | YouGov | 2025 | [Primary publisher report](https://yougov.com/en-us/articles/51508-would-you-tell-your-friend-bad-body-odor-bad-breath-what-americans-say-poll) |
| fall | 5 | YouGov | 2026 | [Primary publisher report](https://yougov.com/en-us/articles/55679-which-fall-activities-do-americans-plan-to-do) |
| cinema | 4 | YouGov | 2024 | [Primary publisher report](https://yougov.com/en-us/articles/50213-superhero-fatigue-and-reboot-resistance-among-americans) |
| petPew | 2 | Pew Research Center | 2023 | [Primary publisher report](https://www.pewresearch.org/short-reads/2023/07/07/about-half-us-of-pet-owners-say-their-pets-are-as-much-a-part-of-their-family-as-a-human-member/) |

## Existing database upgrades

On first startup of this bank revision, the server disables previously auto-seeded `pew-*` questions. The migration marker prevents repeated disabling after an administrator re-enables one. New `curtbox-culture-*` version 2 questions replace unchanged, published version 1 seeds without overwriting `/admin` edits, disables, or hard deletions. It preserves questions created or modified through `/admin`, and it does not change a match already in progress. This is a one-time migration keyed by `seed_registry`. Previously played match snapshots remain intact.

For entirely clean rooms, restart with the new seed. For a custom or previously deployed database, check `/admin` for any old custom-published questions you do not wish to play.

## Counts and testing

- 302 percentage questions total (172 original curated + 130 expanded); 2 sourced finale sets.
- All 172 original curated percentage questions were rewritten to simple, direct percentage prompts, with no survey-source preambles.
- Current prompts are 7–19 words long; server/admin validation allows 6–25 words and rejects “according to.”
- Seeded rewrites are published as version 2 so existing rooms can continue using immutable question versions while new games see cleaner copy.
- Uncurated older percentage seeds are not included in the packaged source or runtime seed import.


## Additional culture/behavior content (130 questions)

The supplementary set in `server/src/expandedCultureSeed.ts` adds **130** direct, party-friendly questions across 17 subjects. These are separate from the existing 172-question curated seed; the combined bank is **302** percentage questions plus the two finale sets.

The extra sources are primary YouGov articles with article-level questionnaire context; some exact question text is not reproduced on the publisher's article page and is explicitly marked unavailable in the seed. The published report URLs are carried in each question for verification. Where survey methodology is incomplete, the seed marks unknown details rather than inventing them.

| Subject | Questions | Original report |
|---|---:|---|
| airplane | 2 | [YouGov primary report](https://yougov.com/en-us/articles/49673-in-flight-drama-where-americans-sit-on-airline-etiquette) |
| awkward | 12 | [YouGov primary report](https://yougov.com/en-us/articles/44123-how-tolerant-are-americans-awkward-situations) |
| birthday | 7 | [YouGov primary report](https://yougov.com/en-us/articles/44982-how-americans-celebrate-their-birthdays) |
| diningout | 3 | [YouGov primary report](https://yougov.com/en-us/articles/49191-what-americans-think-about-restaurant-etiquette) |
| dream | 12 | [YouGov primary report](https://yougov.com/en-us/articles/44813-what-do-americans-dream-about-yougov-poll) |
| gifting | 4 | [YouGov primary report](https://yougov.com/en-us/articles/17378-unwanted-holiday-gifts) |
| gossip | 9 | [YouGov primary report](https://yougov.com/en-us/articles/50564-majorities-americans-think-gossiping-bad-for-society-harmful-mean-spirited-poll) |
| lying | 3 | [YouGov primary report](https://yougov.com/en-us/articles/19438-49-americans-have-lied-their-significant-others-mo) |
| nude | 9 | [YouGov primary report](https://yougov.com/en-us/articles/52876-what-do-americans-think-of-public-nudity) |
| petlife | 8 | [YouGov primary report](https://yougov.com/en-us/articles/51499-most-dog-and-cat-owners-say-their-pets-know-them-well) |
| prank | 5 | [YouGov primary report](https://yougov.com/en-us/articles/34949-are-april-fools-day-pranks-annoying-or-amusing) |
| roadsound | 2 | [YouGov primary report](https://yougov.com/en-us/articles/23333-summer-road-trip-auto-features-safety) |
| roadtrip | 1 | [YouGov primary report](https://yougov.com/en-us/daily-results/20230510-2487c-3) |
| romance | 10 | [YouGov primary report](https://yougov.com/en-us/articles/52212-half-americans-say-been-cheated-on-one-third-say-been-the-cheater-relationships-poll) |
| sleep | 3 | [YouGov primary report](https://yougov.com/en-us/articles/22649-sleep-habits-americans-survey-poll) |
| toilet | 28 | [YouGov primary report](https://yougov.com/en-us/articles/45245-toilet-talk-polling-americans-potty-preferences) |
| wedding | 12 | [YouGov primary report](https://yougov.com/en-us/articles/47928-surveying-americans-on-wedding-etiquette) |

**Editorial follow-up:** Individual findings should be cross-checked against linked questionnaire toplines before production use. Spot checks confirmed representative results from bathroom habits, dreams, wedding etiquette, gossip, pets, romance, public nudity, birthdays, and pranks, but not all 130 new entries have been individually audited. This distinction is deliberate; do not treat source-link presence alone as complete verification.
