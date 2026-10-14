# Taimo Privacy Policy

**Last updated:** [PUBLICATION DATE]

> Draft written from what the code of version 1.0.0 actually does (`src/`, `modules/taimo-capture`, `native/ios`, `supabase/migrations`). Have it reviewed by a legal adviser and fill in everything in [BRACKETS] before publishing. The Spanish version (`privacy-policy-es.md`) prevails in case of discrepancy [CONFIRM].

Taimo is a free app to keep track of your spending. We designed it so your data stays on your phone. **Taimo never asks for your bank passwords and does not connect to your bank.** This policy explains, in plain words, what data is used, where it is stored and what your rights are.

## 1. Who is the controller

- **Data controller:** [COMPANY LEGAL NAME OR OWNER'S NAME]
- **Tax ID (NIF/CIF):** [NIF/CIF]
- **Address:** [FULL POSTAL ADDRESS]
- **Privacy contact email:** [PRIVACY EMAIL, e.g. privacy@domain]
- **Data Protection Officer (DPO):** [DPO NAME AND EMAIL, or "We have not appointed a DPO because we are not required to (Art. 37 GDPR); please write to the privacy email"]

## 2. In short

| Where is your data? | When? |
|---|---|
| **Only on your phone** | Always, by default. If you don't sign in or share groups, no expense ever leaves your phone. |
| **In your private cloud backup** | Only if you sign in with Apple or Google. |
| **On the groups server** | Only the expenses of groups you choose to share with other people. |

- No ads.
- We don't sell or rent your data.
- No analytics or tracking tools, and no advertising profiles.
- We don't offer loans or share your data with financial companies.

## 3. Data stored on your phone

All of this is kept in the app's private storage on your phone. We have no access to it:

- **Your expenses:** amount, merchant, category, date, notes, source (manual, Apple Pay, bank notice, receipt, statement…), original currency and exchange rate if you paid in another currency, and receipt items if any.
- **Your profile:** name (whatever you type), currency, language, appearance, whether the lock and reminders are on.
- **How people pay you** (optional): your Bizum (phone number), IBAN, PayPal.me or Revolut username, if you enter them.
- **Income** (optional): monthly pay and weekly hours, only to show expenses in hours of work. **It never leaves your phone** (not even in the cloud backup).
- Budgets, groups and their members (the names you enter), settlements, savings goals, challenges, wishlist, categories you corrected, apps you chose to ignore, "Money that's yours" items you dismissed or recovered, and the latest downloaded exchange rates.

Calculations (budgets, forecasts, subscriptions, "Money that's yours", answers from "Ask Taimo") are done **on your phone**.

If you delete the app or tap **Settings → Delete all my data**, this data is removed from the phone.

## 4. How payments get logged automatically

### 4.1 Android: notification access (only if you turn it on)

If you give Taimo **notification access** (you turn it on yourself in Android settings), the app:

- Checks incoming notifications on your phone to detect **payment notices** from banks, wallets (such as Google Wallet) or bank text messages.
- **Never** processes notifications from WhatsApp, Telegram, Signal, Messenger, Instagram, Facebook, email (Gmail, Outlook), Slack, Teams, Discord and other messaging or social apps.
- Only keeps notifications that look like a payment (an amount plus a purchase word). For those it stores the app name, the notification title and text and the time, to turn them into an expense when you open Taimo. **All other notifications are ignored and not stored anywhere.**
- Everything happens on your phone. Notifications are **not sent** to us or anyone else.
- You can ignore any app from "Automatic logging" and withdraw the permission at any time in Android settings.

Legal basis: your **consent** (Art. 6(1)(a) GDPR), which you can withdraw at any time.

### 4.2 iPhone: Apple Shortcuts and Siri

On iPhone, Taimo cannot read notifications. If you create a **Shortcuts automation** with the Wallet "Transaction" trigger, Apple passes Taimo the **amount, merchant and card name** of each Apple Pay payment. With **Siri** ("Hey Siri, log an expense in Taimo") you give it the amount and what it was for. Taimo stores this on your phone and turns it into an expense. We receive neither your card details nor anything from Wallet beyond what your automation passes on.

### 4.3 "Paste bank notice"

If you tap **"Paste bank notice"** when adding an expense, Taimo reads the text you copied (your bank's notice or text message) to fill in the amount, merchant and category. **It only reads the clipboard when you tap that button**, processes it on the phone and sends it nowhere.

### 4.4 Nightly reminder (iPhone, optional)

If you turn it on, Taimo schedules a daily notification on your phone at 21:30 to remind you to log payments made with your plastic card. It is a local notification: it doesn't go through any server. The same applies to the weekly summary, budget alerts and the reminder before each subscription charge.

### 4.5 Camera and photos (receipts)

With your permission, we use the **camera** or your **photos** only to read the receipt you choose. Text is recognised **on your phone** (Apple Vision on iPhone; Google ML Kit on Android, which works offline). We don't upload the photo to any server. Google states that ML Kit may send Google anonymous technical usage and performance metrics, never the image content. [VERIFY against current ML Kit documentation before publishing.]

### 4.6 Bank statements

If you import a statement file (CSV, OFX/QFX, QIF, CAMT.053 or MT940), it is read and processed on your phone and sent nowhere.

### 4.7 Face ID, fingerprint or passcode

If you turn on the lock, the operating system checks your identity. Taimo only gets a "yes" or "no"; it **never** receives or stores your face or fingerprint.

## 5. Data that leaves your phone (only if you choose)

### 5.1 Sign in with Apple or Google and cloud backup

Signing in is **optional**. If you do:

- **Account data:** user ID, email address (with Apple it may be a private relay address), provider (Apple or Google) and the basic profile data the provider shares (e.g. name). Handled by our authentication provider (Supabase Auth).
- **Private backup:** shortly after each change, Taimo automatically uploads a copy of your app data: expenses (including personal ones and their notes), budgets, groups, goals, challenges, wishlist, settings and "how people pay you". **It does not include your income.**
- Only you can read your backup: database access is restricted to your user (row-level security).
- Purpose: so you don't lose your data and can restore it on another phone.
- Legal basis: **performance of the service you request** (Art. 6(1)(b) GDPR).

If you sign out, backups stop. To delete your account and backup, see section 9.

[PENDING: the current version has no in-app "delete account" button. Until it exists, deletion is handled by email. Apple requires this button; see `launch-checklist.md`.]

### 5.2 Shared groups

A group (couple, flat, trip…) stays on your phone until you tap **"Invite"**. Then it is stored on our server so members can see it on their phones:

- Group name, emoji, type and currency, and its settings (budget, dates, fixed bills, kitty, default split).
- Members' names (as each one enters them) and, if a member added it, **how they get paid** (Bizum, IBAN, PayPal.me, Revolut). If you filled in "How people pay you" in Settings, that data is shared with the members of your shared groups so they can pay you.
- Group expenses: amount, merchant, category, date, who paid, each person's share, split method, original currency and receipt items. **Private notes are not shared.**
- Settlements (who paid whom).

**Your personal expenses are not uploaded to groups.** Groups are not tied to an account: **anyone with the group code or invite link can view and edit the group**, so only share it with people you trust. Legal basis: **performance of the service** (Art. 6(1)(b) GDPR). When you add another person's name or payment details, make sure they agree.

### 5.3 "Pay your part" and payment request links

When you show the "Pay your part" QR code or send a "Request the money" link, the data needed (merchant, amounts, items, your name and how you get paid) **travels inside the link itself**, in the part after "#". That part is read by the browser of whoever opens it and **is not sent to our server**. The web page is served from [WEB DOMAIN, e.g. https://domain/taimo]; our hosting provider ([HOSTING PROVIDER, e.g. Vercel Inc.]) may log technical data about the visit (IP address, browser, date) for security.

Whoever opens the link types their name and what they had; that information comes back to you in the message **that person chooses to send** (e.g. on WhatsApp). Payments happen outside Taimo (Bizum, PayPal, Revolut or bank transfer): Taimo does not process payments or see your accounts.

### 5.4 Exchange rates

To convert currencies, the app downloads public exchange rates from [cdn.jsdelivr.net, latest.currency-api.pages.dev and open.er-api.com]. The request carries no personal data, but like any website those services receive your IP address.

### 5.5 External links

Some buttons open other websites or apps at your request: PayPal.me, Revolut.me, WhatsApp or a Google search ("How to cancel", "How to claim"). What you do there is governed by those services' privacy policies.

## 6. Processors and international transfers

| Provider | Purpose | Location |
|---|---|---|
| Supabase Inc. | Backup and groups database; authentication | Region [SUPABASE REGION, e.g. eu-west-1 (Ireland) / eu-central-1 (Frankfurt)] |
| [WEB HOSTING PROVIDER, e.g. Vercel Inc.] | "Pay your part" and payment web pages | [LOCATION] |
| Apple / Google | Sign-in, if you choose it | Per their policies |

Data is stored on servers inside the European Economic Area [CONFIRM region]. Some providers are US companies and could access data from outside the EEA (e.g. for support). In that case transfers rely on the **EU-US Data Privacy Framework** where the provider is certified and/or the European Commission's **Standard Contractual Clauses**. You can ask us for a copy of the safeguards at the privacy email.

## 7. How long we keep data

- **On your phone:** until you delete it or uninstall the app.
- **Account and cloud backup:** while you have the account. If you ask us to delete it, we do so within [30] days (the backup is deleted with the account).
- **Shared groups:** while the group exists. Leaving a group on your phone doesn't delete it from the server, because other members still use it. [PERIOD: e.g. "We delete groups with no activity for 24 months"] and you can ask us to delete a group by emailing the privacy address with its code.
- **Server and hosting technical logs:** [PERIOD, e.g. up to 30 days], unless longer is needed for security or legal reasons.

## 8. Children

Taimo is not directed at children under **14** (the age of digital consent in Spain, Art. 7 LOPDGDD; other EU countries may set between 13 and 16). If you are under that age, don't sign in or share groups without a parent's or guardian's permission. If we learn that we have received data from a child without that permission, we will delete it.

## 9. Your rights

You can exercise at any time your rights of **access, rectification, erasure, objection, restriction of processing and portability**, and **withdraw your consent** (without affecting what was done before), by writing to [PRIVACY EMAIL] from your account email or giving the group code. We will answer within one month.

You can do much of this yourself in the app:

- **Access and portability:** Settings → export to CSV or make a backup file.
- **Rectification:** edit any expense or detail.
- **Erasure on the phone:** Settings → Delete all my data.
- **Withdraw permissions:** in your phone settings (notifications, camera, photos).

If you think we have not handled your data properly, you can complain to the **Spanish Data Protection Agency** (www.aepd.es) or the authority in your country.

## 10. Security

- Encrypted connections (HTTPS) to the server.
- Cloud backup accessible only by its owner (row-level security).
- Group tables are not directly accessible: everything goes through functions that require the group code (16 random characters).
- Optional app lock with Face ID, fingerprint or passcode.

No system is 100% secure. If a breach affects your data, we will notify it as the law requires.

## 11. Changes to this policy

If we change something important, we will tell you in the app or on the store listing before it takes effect. The current version is always at [POLICY URL, e.g. https://domain/taimo/privacy].

## 12. Contact

[LEGAL NAME] · [ADDRESS] · [PRIVACY EMAIL]
