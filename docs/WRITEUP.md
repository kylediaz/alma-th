# Writeup

## Design choices

1. **How do we handle email sending durably?** At Chroma, I built
    something similar for customer support. Initially, it would send
    emails using SES in the background in process. We quickly noticed that it would
    occasionally drop emails. The standard way of handling this would be to use
    some durable job executor such as Celery. I feel this is overkill for a project like
    this — Redis, workers, and retry plumbing would dominate the takehome for little gain
    at this scale.

2. **Build vs buy: sending emails:** Email sending is remarkably easy to set up using
    AWS SES, though I made the decision to use a higher-level API with a better DX for
    operational simplicity. I'm more than happy to pay extra for a simpler API if it means
    I can focus more on higher-level problems. This was my first time using Resend (it was
    my agent's suggestion), and I'm very impressed. I would most definitely use it in production.

## AI Usage

AI wrote everything. I made minor edits here and there, and told it to use different patterns occassionally.

Here's my general workflow for greenfield projects like this, with AI:

1. Do as much design work as possible without AI. If you ask the AI to generate a design for you,
   it's easy to be convinced that its design is sufficient. By designing without AI up front, it helps
   me see angles I would not have considered earlier.
2. Use AI to refine my design as much as possible. I ask different models to critique the plan until
   I get something I'm happy with. I need to be careful that it doesn't overdesign things. I try to
   specify the task as much as possible up front. I do not leave room for the agent to make design decisions
   on its own. As an aside, this is how benchmarks like SWE-bench are designed. This is what agents are trained
   to excel at -- purely translating specs into code.
3. Tell the agent to just build it, part by part. I refine each part before moving onto the next. This part is easy
   to parallelize with multiple agents.

## Other

There was so much more I wanted to do. I stuck to what was described in the design spec,
but there are tons of things I could add to make this much more useful to the attorneys.

1. Each case can automatically be assigned to a particular attorney. In general, this helps
   because ownership over a case becomes clear. This helps make sure that no case goes unaddressed
   because someone wasn't certain if someone else took it. Additionally, as I mentioned in the email,
   it also addresses the race condition where multiple people take the case before the mark it as "replied to"
   in the dashboard.
2. Instead of making attorneys manually send an email outside of the dashboard, they can have a one-click
    "send template email" button within the dashboard. 