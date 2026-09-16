# 🚆 Realtime

Realtime is a multi-modal journey planner which uses live UK rail/bus data to calculate the most efficient route out of a selection of pre-defined routes.

<picture>
    <source srcset="/public/site-preview-1.png" media="(orientation: portrait)" />
    <img src="/public/site-preview-1.png" alt="Screenshot of the website with one route displayed" />
</picture>

### How to access
Use the live demo at the bottom of the README (to login, use the email "test@example.com" and password "hctester")
### OR
- Download the project files as a `.ZIP` or clone the repo using `git clone https://github.com/matthew-seaber/realtime.git` in your terminal
- Run `bun install` to install the required dependencies
- Use the `.env.example` file to see the required secrets
- Run `bun dev` to start a local development server (default: `http://localhost:3000`)
- To customise the routes the program considers to reach the destination, open `lib/journey-options.ts` and use the placeholder data as a guide to create your own routes

_Note: [RTT API](https://api-portal.rtt.io) (used for trains) gives 10 free hits/min, but [TransportAPI](https://developer.transportapi.com/signup) (used for buses) only gives 30 free hits in a rolling 24 hour period (disabling `reactStrictMode` in `next.config.ts` will halve your API usage). As a result, if you're customising the routes in `lib/journey-options.ts`, I only recommend adding a couple of relatively short routes at a time (each public transit leg uses 2 requests from the respective API)._

## Key features
- Multi-modal transport planner - currently supports walking and trains/buses with live data (UK-wide)
- Full route customisation - you decide how long you take to walk certain legs, which bus lines you're willing to take, and how much connection time you need for public transit
- Alternative route suggestions - give the program multiple route options to consider (only 2 are displayed at a time - bear in mind API usage limits if adding multiple routes)

<picture>
    <source srcset="/public/site-preview-2.png" media="(orientation: portrait)" />
    <img src="/public/site-preview-2.png" alt="Screenshot of the website with two routes displayed" />
</picture>

_Note: UX/UI on mobile devices is very poor since this website was primarily designed to be displayed on a 24" monitor._
_AI disclosure: there was occassional AI usage towards the end of the project to help me understand the two external APIs and the data they returned. This was mainly to fix bugs which I had already tried to fix myself, and each line edit AI made was only accepted if I fully understood what it did and why it was needed to solve the wider problem._

## Live demo
👉 [Realtime website](https://realtime-gamma-three.vercel.app/) (hosted on Vercel using Next.js)

_Note: accessing the site outside of the UTC+1 (UK time) time zone may lead to some timing display issues._