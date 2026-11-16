-- Hiraeth: NFC is shared by collection. No per-candle codes are issued or claimed.
-- Preserve all tables, rows, membership data, house choices and historical records.
-- Disable the two legacy authenticated RPC endpoints without deleting any data.
-- Idempotent: repeated REVOKE is safe.
begin;
revoke execute on function public.create_house_nfc_access_code(text) from authenticated;
revoke execute on function public.claim_house_nfc_access_code(text) from authenticated;
commit;
