-- Let the message outbox carry team invitation emails
alter table message_outbox drop constraint if exists message_outbox_kind_check;
alter table message_outbox add constraint message_outbox_kind_check check (kind in (
  'booking_confirmed', 'request_received', 'request_accepted', 'request_declined', 'request_expired',
  'reconfirm', 'cancelled_by_guest', 'weather_cancelled', 'auto_cancelled', 'cancelled',
  'operator_request', 'admin_alert', 'team_invite'));
alter table message_outbox drop constraint if exists message_outbox_recipient_check;
alter table message_outbox add constraint message_outbox_recipient_check check (recipient in ('guest', 'operator', 'platform', 'invitee'));

