# Horse Show Timing App — Product Roadmap
 
---
 
## V1 — The Timer (MVP)
 
**The single job:** tell a rider when to get on.
 
### What the user does at the start of their show day
- Create an account
- Add a show (name, date)
- Add a class: division/type, total entries, their order of go, their personal warm-up time preference (e.g. "I need 20 minutes")
- Tap "class is starting" when the first horse enters the ring (their one real-time action) and continue to update: ("3 horses have gone")
### What the app does
- Applies pre-built timing model for that division cluster
- Counts down to "get on now" and "you're on deck"
- Push notification at both moments
- Simple live display: *"~14 min until your go | Get on at 2:08 PM | ~15 min until you should start warm up"*
### Explicitly NOT in V1
- No SGL integration — all manual entry
- No multi-horse management
- No crowdsourced pace correction
- No trainer accounts
- No historical analysis visible to the user
### Core technical pieces
- Auth + simple user profile
- Class setup form
- Timing model (Monte Carlo logic baked into the backend)
- Push notifications
- A single clean countdown screen
### Notes
The countdown screen is the whole product — it needs to be glanceable, readable in bright sunlight, and trustworthy. 
 
---
 
## V2 — The Live Ring
 
**The theme:** reduce manual input, increase accuracy.
 
### What's new
- **Crowdsourced pacing** — a "my round is done" button after each go. Enough users tapping this creates a live pace signal per ring. The app self-corrects: *"this ring is running 12% fast today"*
- **Class start detection** — instead of the user tapping "class started," the app detects it from crowdsourced signals or SGL scraping
- **Multiple classes per day** — add a full day's schedule and see a timeline view: *"Class 12 at ~10:40, Class 31 at ~2:15"*
- **Running fast/slow manual override** — let the user tap "this ring is running fast" and the model adjusts
- **Basic show lookup** — type in a show name, app pulls the class list from SGL (scraped), pre-populating division type and entry count
### Notes
V2 is where the product starts to feel smart rather than just useful. The crowdsourcing mechanic is the most important new bet — it's what separates the app from a fancy calculator.
 
---
 
## V3 — The Trainer Dashboard
 
**The theme:** expand to the use case with the highest willingness to pay.
 
Trainers managing 4–8 students across 2 rings are in more pain than individual riders. They're doing all this mental math simultaneously, walking between rings, texting students.
 
### What's new
- **Trainer accounts** with linked student riders
- **Multi-ring view** — a dashboard showing all horses across all active rings, sorted by "get on" time
- **Student notifications** — trainer can push "get on now" directly to a student's phone
- **Conflict detection** — *"you have two horses going within 8 minutes of each other in different rings"*
- **SGL account linking** — if the trainer's barn is registered on SGL, pull their full entry list automatically
### Monetization
This is the natural point to introduce paid tiers. Individual riders might pay a small annual fee; trainers pay a monthly subscription for the dashboard. The individual rider app could stay free as a funnel into the trainer tier.
 
---
 
## V4 — The Data Layer (Moat)
 
**The theme:** accumulated timing data becomes a defensible asset.
 
By V4, real-world trip timing across hundreds of shows and thousands of classes has been collected — a dataset that doesn't exist anywhere else.
 
### What's new
- **Show-specific models** — HITS Ocala runs differently than a local A show. The model knows this.
- **Time-of-day and day-of-week adjustments** — morning classes run slower; Friday afternoon at a week-long show is chaos
- **Historical show pace context** — *"this show has historically run 18% fast"* shown to users on arrival
- **Exhibitor-facing analytics** — *"your average wait between scheduled and actual go time across 12 shows is 23 minutes"*
- **Potential B2B play** — show managers and venues may pay for aggregate timing analytics about their own shows
---
 
## Design Principle (All Versions)
 
> **The app should always be more right than a rider's gut, and it should never make them miss a class.**
 
Being 5 minutes early is fine. Being 2 minutes late is catastrophic. The model should build in a conservative buffer by default, with the option for users to tune it if they want to live dangerously.
 
