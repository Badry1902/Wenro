# WhatsApp trip details: setup

WENRO sends trip details on WhatsApp through the official **WhatsApp Business Cloud API** (Meta):

- to the **guest** (only if they keep the box "Also send my trip details on WhatsApp" ticked in the booking form);
- to the **operator** (the WhatsApp number in the operator's details: `org_private_details.contact_phone`).

Business-started WhatsApp messages must use **templates approved by Meta**. Until the keys below are set,
nothing is sent: each message is written to the server log and marked "logged" on the Messages page.

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
