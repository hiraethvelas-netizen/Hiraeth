"""Run after the fixture/assertions, against the disposable local Docker DB only."""
import concurrent.futures
import json
import subprocess
import sys
import threading

container = sys.argv[1] if len(sys.argv) > 1 else "hiraeth-variant-recipes-pg"
database = sys.argv[2] if len(sys.argv) > 2 else "variant_recipes_second"


def sql(statement):
    return subprocess.check_output(
        ["docker", "exec", container, "psql", "-U", "postgres", "-d", database,
         "-At", "-v", "ON_ERROR_STOP=1", "-c", statement], text=True
    ).strip()


def checkout(suffix, key="250g"):
    checkout_id = "30000000-0000-0000-0000-" + str(suffix).zfill(12)
    sql("""
      insert into public.commerce_checkouts(id,user_id,email,recipient,items,freight,subtotal,shipping,total)
      select '%s','00000000-0000-0000-0000-000000000002','fictional@example.invalid','{}',
        jsonb_build_array(jsonb_build_object('productId',id,'name',name,'quantity',1,'price',30,
          'stockVariantKey','%s','variantDetails',jsonb_build_object('stockVariantKey','%s'))),
        '{}',30,0,30 from public.products where slug='vela-ficticia'
    """ % (checkout_id, key, key))
    return checkout_id


def payment(checkout_id, payment_id):
    result = sql("""
      set role service_role;
      set request.jwt.claim.role='service_role';
      select public.confirm_paid_commerce_checkout('%s','%s',30,'pix')
    """ % (checkout_id, payment_id))
    return json.loads(result.splitlines()[-1])


def concurrently(*operations):
    barrier = threading.Barrier(len(operations))

    def invoke(operation):
        barrier.wait()
        return operation()

    with concurrent.futures.ThreadPoolExecutor(max_workers=len(operations)) as executor:
        return list(executor.map(invoke, operations))


sql("update public.essences set stock_ml=20 where stock_unit='g'")
first, second = checkout(3), checkout(4)
results = concurrently(lambda: payment(first, "fictional-concurrent-one"),
                       lambda: payment(second, "fictional-concurrent-two"))
assert sorted(row["status"] for row in results) == ["paid", "paid_attention"], results
assert sql("select stock_ml from public.essences where stock_unit='g'") == "0.000"
assert sql("select stock from public.products where slug='vela-ficticia'") == "25"
assert sql("select count(*) from public.orders") == "2"

sql("update public.essences set stock_ml=60 where stock_unit='g'")
third = checkout(5)


def add_stock():
    return sql("""
      set role authenticated;
      set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
      select public.record_essence_stock_movement(
        '10000000-0000-0000-0000-000000000001','purchase',5,60)
    """)


results = concurrently(lambda: payment(third, "fictional-concurrent-three"), add_stock)
assert results[0]["status"] == "paid", results
assert sql("select stock_ml from public.essences where stock_unit='g'") == "45.000"
assert sql("select stock from public.products where slug='vela-ficticia'") == "24"

fourth = checkout(6, "100-gramas")
results = concurrently(lambda: payment(fourth, "fictional-concurrent-repeat"),
                       lambda: payment(fourth, "fictional-concurrent-repeat"))
assert results[0]["status"] == results[1]["status"] == "paid", results
assert results[0]["order_id"] == results[1]["order_id"], results
assert sql("select stock_ml from public.essences where stock_unit='g'") == "37.000"
assert sql("select stock from public.products where slug='vela-ficticia'") == "23"
assert sql("select count(*) from public.orders") == "4"
assert sql("select min(stock_ml) >= 0 from public.essences") == "t"
print("Concurrent payments, repeated callbacks and purchase/sale balances passed.")
