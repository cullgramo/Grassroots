# Fixture reports and club claims: reading and answering them

When someone taps **"Something wrong with this fixture? Tell us"**, or sends **"Claim your club"**, it's saved in the
database. The hourly health check (`docs/health-check.md`) adds a line to its GitHub issue whenever there are open
reports or new claims, and GitHub emails you. The issue shows only counts, game titles and problem types, because it's
a public page. Read the details, which can include notes, names and emails, in the Supabase **SQL Editor**.

When 3 or more open reports from the last week are about the same game, the app shows "Reported as possibly wrong.
Check with the club before you travel." on it. Marking the reports done removes the warning.

## Reports

See them, most-reported first:

```sql
select * from open_fixture_reports;
```

Look at the source page (`source_url`). If the source is right and the report is wrong, or the fix is on its way
from the source, mark them done:

```sql
-- One game's reports (copy the fixture_id from the list above):
update fixture_reports set status = 'fixed' where fixture_id = '<fixture_id>' and status = 'new';
-- Or, if the report was mistaken:
update fixture_reports set status = 'not a problem' where fixture_id = '<fixture_id>' and status = 'new';
```

If the source itself is wrong, tell the club or county board. The next morning's collection picks up their correction.

## Club claims

```sql
select created_at, club_name, county, contact_name, role, email, message from club_claims where status = 'new' order by created_at;
```

Check that the person really runs the club (for example, email the address listed on the club's own website). Then
reply to them and mark the claim:

```sql
update club_claims set status = 'verified' where email = '<their email>' and club_name = '<club>';
-- or 'rejected'
```

The health issue closes on its own once nothing is left open.
