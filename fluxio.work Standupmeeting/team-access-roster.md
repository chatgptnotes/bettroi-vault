---
title: Brain Team Access Roster
purpose: Assign brain access roles to each team member
last_updated: 2026-05-17
---

# Brain Access Roster — Fill In & Apply

For each row below, fill in the `role` field. Save the file when done, then tell Claude *"apply team roster"* — it'll insert everyone into `brain_user_roles` and they'll have access immediately.

## Available roles

| Role | Sees | Cannot see |
|---|---|---|
| `murali` | Everything | Nothing (you only) |
| `ceo` | Everything | `[Private]` tagged |
| `partner` | Everything | `[Private]`, HR, salary |
| `coo` | All projects | HR, salary, accounts, payments, `[Private]` |
| `accountant` | Accounts/payments/finance + all projects | HR, salary, hiring, `[Private]` |
| `hr` | HR/salary/hiring + all projects | Accounts, payments, finance, strategy, `[Private]` |
| `sales_lead` | 28 client-facing projects | HR, salary, finance, strategy, `[Private]`, internal |
| `developer` | All projects | HR, salary, accounts, payments, finance, sales, strategy, `[Private]` |
| `hospital_staff` | Adamrit, hopetech, DDO, hope | HR, salary, finance, strategy, `[Private]`, internal |
| `skip` | _(no brain access)_ | Use this to explicitly skip a person |

## Roster

> ⚠️ **Verify Slack IDs first.** I read these from your screenshot — some characters may be wrong. Double-check each ID by right-clicking the person in Slack → ⋯ → Copy member ID.

| # | Display Name | Email | Slack ID | Role (fill in) |
|---|---|---|---|---|
| 1 | Accountant | accountanthope@gmail.com | `U0BS1IFSAQ4` | `accountant` |
| 2 | Akshay Jaisinghani | akshay.jaisinghani@... | `U0B25UV9KKD` | `` |
| 3 | Aniruddha | (currantswanyaonh@yahoo.co.in) | `U0B25HJ5JFZ4` | `` |
| 4 | Ashras (Ahras?) | ahras@bettroi.com | `U0B2UQQVZ34` | `` |
| 5 | Bhavik Sharma | bhavikshamya5@yahoo.co.in | `U0B27LR79DK` | `` |
| 6 | Biji Thomas | biji.thomas@bettroi.com | `U0B2YQ4DDZE` | `ceo` |
| 7 | BK / Dr. Murali (YOU) | cmd@hopehospital.com | `U76CM0C31` | `murali` _(already configured, do not change)_ |
| 8 | chatgptnotes | chatgptnotes@gmail.com | `U0B23X8RMWH2` | `` |
| 9 | Haritha V K | adwin@bettroi.com | `U0B232FRQQTZ` | `sales_lead` |
| 10 | Himanshu Lokhande | himanshu.lokhande88@gmail.com | `U0B25PA53VP` | `` |
| 11 | Jolu | info@hopehospital.com | `U0B2A8KQR03T` | `hr` |
| 12 | KaushikR | kaushikrk84R12@gmail.com | `U0B2VAT3MIL` | `` |
| 13 | MD ANAS | md.anas@bettroi.com | `U0B25CY3SD0E` | `` |
| 14 | Rohu | rgini@hopehospital.com | `U0B2STIK3HD` | `` |
| 15 | Sahil Jha | sahil@bettroi.com | `U0B25BR9QIL` | `` |
| 16 | Saikat Dutta | saikat.dutta@bettroi.com | `U0B2N3KW8L` | `` |
| 17 | josh.dutta | josh.dutta@gmail.com | `U0B23KPXKLM6` | `` |
| 18 | Yatharth Bhute | yatharth.bhute@gmail.com | `U0B2YR4Y3LT` | `` |
| 19 | _(Caroline COO — not visible)_ | | _need from you_ | `coo` |

## Add more people (optional)

If anyone is missing, add them as new rows below:

| # | Display Name | Email | Slack ID | Role |
|---|---|---|---|---|
| 20 | | | | |
| 21 | | | | |

---

## How to apply

When you've filled in roles:

1. Save this file (Obsidian saves automatically)
2. Tell Claude: *"apply team roster"*
3. Claude inserts everyone into `brain_user_roles` and verifies each ID via Slack API
4. Everyone in the roster can immediately DM @Bettroi for brain access

To revoke access later: change a role to `skip` and re-apply.
