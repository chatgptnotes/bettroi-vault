> ## Documentation Index
>
> Fetch the complete documentation index at: [/llms.txt](https://developers.fathom.ai/llms.txt)
>
> Use this file to discover all available pages before exploring further.

[Skip to main content](https://developers.fathom.ai/quickstart#content-area)

[Fathom API home page![light logo](https://mintcdn.com/fathom-e4df0608/fpW1q81hxUkk93dq/logo/blacklogo.png?fit=max&auto=format&n=fpW1q81hxUkk93dq&q=85&s=0bcb3214b43ee48b36d667838d2ce9d2)![dark logo](https://mintcdn.com/fathom-e4df0608/fpW1q81hxUkk93dq/logo/whitelogo.png?fit=max&auto=format&n=fpW1q81hxUkk93dq&q=85&s=7ec9aca099533e9b45cbc89f18daf880)](https://developers.fathom.ai/)

Search...

Ctrl K

Search...

Navigation

Getting started

Quickstart

[Guides](https://developers.fathom.ai/) [API docs](https://developers.fathom.ai/api-overview) [SDK Docs](https://developers.fathom.ai/sdks) [MCP](https://developers.fathom.ai/mcp-docs) [Inspiration](https://developers.fathom.ai/inspiration)

### Getting started

- [Introduction](https://developers.fathom.ai/)
- [Quickstart](https://developers.fathom.ai/quickstart)
- [Webhooks](https://developers.fathom.ai/webhooks)
- [Building with OAuth](https://developers.fathom.ai/oauth)

## On this page

- [Generate an API Key](https://developers.fathom.ai/quickstart#generate-an-api-key)
- [List recent meetings](https://developers.fathom.ai/quickstart#list-recent-meetings)
- [Get next 10 meetings](https://developers.fathom.ai/quickstart#get-next-10-meetings)
- [Find specific meetings and get their transcripts](https://developers.fathom.ai/quickstart#find-specific-meetings-and-get-their-transcripts)
- [Next steps](https://developers.fathom.ai/quickstart#next-steps)

Getting started

# Quickstart

Generate an API key and make your first call

## [​](https://developers.fathom.ai/quickstart\#generate-an-api-key)  Generate an API Key

[**Get your Fathom API Key** \\
\\
Head to the API Access section of your User Settings and generate an API key.\\
\\
User Settings](https://fathom.video/customize#api-access-header)

API keys are scoped to the user who creates them. Your key can only access meetings you’ve recorded or that have been shared with you or your Team.

Admins can access all users’ shared meetings by [configuring View permissions](https://help.fathom.video/en/articles/10783489#understanding_permissions). API keys _never_ grant access to other users’ private meetings.

## [​](https://developers.fathom.ai/quickstart\#list-recent-meetings)  List recent meetings

List the 10 most recent meetings recorded by you or shared to your team.

cURL

Python

TypeScript

```
curl https://api.fathom.ai/external/v1/meetings \
     -H "X-Api-Key: YOUR_API_KEY"
```

Replace `YOUR_API_KEY` with the API key you generated above.

Here's an example response

Example response

```
{
"items": [\
{\
  "title": "Quarterly Business Review",\
  "meeting_title": "QBR 2025 Q1",\
  "meeting_type": "Quarterly Business Review",\
  "url": "https://fathom.video/xyz123",\
  "share_url": "https://fathom.video/share/xyz123",\
  "created_at": "2025-03-01T17:01:30Z",\
  "scheduled_start_time": "2025-03-01T16:00:00Z",\
  "scheduled_end_time": "2025-03-01T17:00:00Z",\
  "recording_start_time": "2025-03-01T16:01:12Z",\
  "recording_end_time": "2025-03-01T17:00:55Z",\
  "transcript_language": "en",\
  "calendar_invitees": [\
    {\
      "is_external": false,\
      "name": "Alice Johnson",\
      "email": "alice.johnson@acme.com"\
    }\
  ],\
  "recorded_by": {\
    "name": "Alice Johnson",\
    "email": "alice.johnson@acme.com",\
    "team": "Marketing"\
  },\
  "transcript": [\
    {\
      "speaker": {\
        "display_name": "Alice Johnson",\
        "matched_calendar_invitee_email": "alice.johnson@acme.com"\
      },\
      "text": "Let's revisit the budget allocations.",\
      "timestamp": "00:05:32"\
    }\
  ],\
  "default_summary": {\
    "template_name": "general",\
    "markdown_formatted": "## Summary\nWe reviewed Q1 OKRs, identified budget risks, and agreed to revisit projections next month.\n"\
  },\
  "action_items": [\
    {\
      "description": "Email revised proposal to client",\
      "user_generated": false,\
      "completed": false,\
      "recording_timestamp": "00:10:45",\
      "recording_playback_url": "https://fathom.video/xyz123#t=645",\
      "assignee": {\
        "name": "Alice Johnson",\
        "email": "alice.johnson@acme.com",\
        "team": "Marketing"\
      }\
    }\
  ],\
  "crm_matches": {\
    "contacts": [\
      {\
        "name": "Jane Smith",\
        "email": "jane.smith@client.com",\
        "record_url": "https://app.hubspot.com/contacts/123"\
      }\
    ],\
    "companies": [\
      {\
        "name": "Acme Corp",\
        "record_url": "https://app.hubspot.com/companies/456"\
      }\
    ],\
    "deals": [\
      {\
        "name": "Q1 Renewal",\
        "amount": 50000,\
        "record_url": "https://app.hubspot.com/deals/789"\
      }\
    ],\
    "error": "no CRM connected"\
  }\
}\
],
"limit": 1,
"next_cursor": "eyJwYWdlX251bSI6Mn0="
}
```

## [​](https://developers.fathom.ai/quickstart\#get-next-10-meetings)  Get next 10 meetings

Use the `next_cursor` from the previous response to get the next page of meetings.

bash

python

TypeScript

```
curl https://api.fathom.ai/external/v1/meetings \
     -H "X-Api-Key: YOUR_API_KEY" \
     -d cursor=CURSOR_FROM_PREVIOUS_RESPONSE
```

If you’re using our [TypeScript or Python SDKs](https://developers.fathom.ai/sdks), pagination is handled automatically - no need to manage cursors manually. See [SDK Pagination](https://developers.fathom.ai/sdks/pagination) for examples.

## [​](https://developers.fathom.ai/quickstart\#find-specific-meetings-and-get-their-transcripts)  Find specific meetings and get their transcripts

Let’s say you met with `john.doe@client.com` a couple times during August and want to pull those transcripts. Use filters to return just those meetings.

cURL

Python

TypeScript

```
curl https://api.fathom.ai/external/v1/meetings \
     -H "X-Api-Key: YOUR_API_KEY" \
     -d include_transcript=true \
     -d recorded_by[]=me@mydomain.com \
     -d created_after=2024-08-01T00:00:00Z \
     -d created_before=2024-09-01T00:00:00Z

# include_transcript=true: get transcripts in the response
# recorded_by[]=me@mydomain.com: meetings you recorded
# created_after/before: August date range
```

You can also fetch transcripts separately using the [/recordings/{recording\_id}/transcript](https://developers.fathom.ai/api-reference/recordings/get-transcript) endpoint. **OAuth apps** must use this approach since they can’t use `include_transcript` or `include_summary`.

## [​](https://developers.fathom.ai/quickstart\#next-steps)  Next steps

Now that you you’ve made your first API calls, time to go deeper:

[**API documentation** \\
\\
See all available endpoints and methods](https://developers.fathom.ai/api-overview)

[**Webhooks** \\
\\
Set up a webhook](https://developers.fathom.ai/webhooks)

[**SDKs** \\
\\
Use our Typescript or Python SDK](https://developers.fathom.ai/sdks)

[**OAuth** \\
\\
Build a Fathom integration with OAuth](https://developers.fathom.ai/oauth)

[Introduction](https://developers.fathom.ai/) [Webhooks](https://developers.fathom.ai/webhooks)

Ctrl+I

[Powered byThis documentation is built and hosted on Mintlify, a developer documentation platform](https://www.mintlify.com/?utm_campaign=poweredBy&utm_medium=referral&utm_source=fathom-e4df0608)