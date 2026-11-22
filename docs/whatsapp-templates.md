# WhatsApp trip details: setup

WENRO sends trip details on WhatsApp through the official **WhatsApp Business Cloud API** (Meta):

- to the **guest** (only if they keep the box "Also send my trip details on WhatsApp" ticked in the booking form);
- to the **operator** (the WhatsApp number in the operator's details: `org_private_details.contact_phone`).

Business-started WhatsApp messages must use **templates approved by Meta**. Until the keys below are set,
nothing is sent: each message is written to the server log and marked "logged" on the Messages page.

## 0. Quick start with Meta's free test number (temporary)
Good for trying the flow with a few known numbers before WENRO's own business number is connected.
1. developers.facebook.com → **My Apps → Create app → Business** → add the **WhatsApp** product.
2. WhatsApp → **API Setup**: Meta gives a **test phone number** and its **Phone number ID**.
   Under **To**, add the numbers that should receive messages (yours, and a test operator's), up to 5;
   each gets a code on WhatsApp to confirm.
3. Create the two templates below (WhatsApp Manager → Message templates, category **Utility**) on the
   test account; approval usually takes minutes.
4. Make a permanent token (Business settings → System users → Add → Generate token, app = this app,
   permissions `whatsapp_business_messaging` + `whatsapp_business_management`). The 24-hour token on the
   API Setup page also works for a first try.
5. Vercel → Environment Variables: `WHATSAPP_TOKEN` (Sensitive), `WHATSAPP_PHONE_NUMBER_ID`,
   `WHATSAPP_ALLOWED_TO` = the verified numbers, comma separated (e.g. `2010xxxxxxxx`). Redeploy.
6. To receive operator messages yourself: put your number as the WhatsApp number of a test operator
   (operator dashboard → Team → Contact details), then book one of its trips.
Messages to numbers outside `WHATSAPP_ALLOWED_TO` are marked "skipped" on the Messages page (no retries).
Later: add WENRO's own number to the same app, swap `WHATSAPP_PHONE_NUMBER_ID`, and empty `WHATSAPP_ALLOWED_TO`.

## 1. Meta account (once)
1. Create a Meta Business account and a WhatsApp Business app at developers.facebook.com.
2. Add and verify WENRO's business phone number.
3. Create a **permanent access token** (System user → token with `whatsapp_business_messaging`).

## 2. Two templates (category: Utility)
Create them in WhatsApp Manager → Message templates. Add the languages you want (at least **Arabic** and **English**).
The numbers must stay in this order.

**`wenro_trip_guest`** (7 values)
```
{{1}}
Hi {{2}},
Trip: {{3}}
When: {{4}}
Guests: {{5}}
Meeting: {{6}}
Your booking: {{7}}
```
Arabic body:
```
{{1}}
مرحبًا {{2}}،
الرحلة: {{3}}
الموعد: {{4}}
الضيوف: {{5}}
التجمع: {{6}}
حجزك: {{7}}
```

**`wenro_trip_operator`** (8 values)
```
{{1}}
Ref: {{2}}
Trip: {{3}}
When: {{4}}
Guests: {{5}}
Name: {{6}}
Phone: {{7}}
Pickup: {{8}}
```
Arabic body:
```
{{1}}
المرجع: {{2}}
الرحلة: {{3}}
الموعد: {{4}}
الضيوف: {{5}}
الاسم: {{6}}
الهاتف: {{7}}
الاستلام: {{8}}
```

## 3. Vercel → Settings → Environment Variables
| Name | Value |
|---|---|
| `WHATSAPP_TOKEN` | the permanent access token (secret) |
| `WHATSAPP_PHONE_NUMBER_ID` | the phone number ID from the WhatsApp app |
| `WHATSAPP_TEMPLATE_LANGS` | the template languages you created, e.g. `ar,en,de,ru,fr` (default `ar,en`) |
| `WHATSAPP_TEMPLATE_GUEST` / `WHATSAPP_TEMPLATE_OPERATOR` | only if you used other template names |

Redeploy after adding them. Messages go out right after each booking (and with the scheduled job as a safety net);
failures are retried and listed on the WENRO Messages page.

**Review before launch:** guest consent wording (booking form), Meta's opt-in policy and messaging costs per country.
