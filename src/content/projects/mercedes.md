---
title: Media Decision Engine
client: Mercedes-Benz
slug: mercedes
summary: Redesigning Mercedes-Benz’s ad analytics platform to fix navigation, onboarding and data visualisation issues.
metaDescription: Working with Interbrand, I helped overhaul Mercedes-Benz’s ad analytics platform, addressing pain points in navigation, onboarding and data visualisation through research, design sprints and collaboration with their UX team.
mediaBase: alan.design/Mercedes
mediaVersion: v1777140383
thumbnail: mercedes-benz-140-years-welcome-home-unwind-airmatic_zviput
order: 3
year: 2025
sector: UX Overhaul
brand:
  primary: "#176DB7"
  secondary: "#000000"
roleSummary: |
  Redesigned Mercedes-Benz's paid-media analytics platform. Restructured the information architecture, consolidated tool-level settings into a global scenario model, and rebuilt onboarding and exports across three sequential sprints.
team:
  - name: Alan Long
    role: Lead Product Designer
    company: Interbrand
    description: |
      Led end-to-end design across the three sprints, owning information architecture, the global scenario settings model, onboarding and exports. Co-facilitated the stakeholder workshop with Mercedes-Benz and OMD.
    headshot: https://res.cloudinary.com/ajalong/image/upload/c_fill,h_160,w_160,f_auto,q_auto/alan.design/headshot-edited.jpg
    linkedin: https://linkedin.com/in/alanalberglong
  - name: Niq Curry
    role: UX Researcher
    company: Interbrand
    description: |
      Conducted user research consisting of stakeholder interviews and user testing. Collaborated with Laura Harding (Project Manager, Interbrand) and me in identifying user insights. Co-led workshops with stakeholders from Mercedes-Benz.
    headshot: https://res.cloudinary.com/ajalong/image/upload/c_fill,h_160,w_160,f_auto,q_auto:best/alan.design/linkedin/1631826630951
    linkedin: https://www.linkedin.com/in/niqcurry/
  - name: Laura Harding
    role: Project Manager
    company: Interbrand
    description: |
      Collaborated with Niq Curry (UX Researcher, Interbrand) and me in identifying user insights. Co-led workshops with stakeholders from Mercedes-Benz.
    headshot: https://res.cloudinary.com/ajalong/image/upload/c_fill,h_160,w_160,f_auto,q_auto:best/alan.design/linkedin/1736521369138
    linkedin: https://www.linkedin.com/in/laura-harding-00357814/
  - name: Lisa Pink
    role: Project Manager
    company: Interbrand
    description: |
      Managed the timeline and the budget to ensure the project stayed on course. Provided guidance on what was in scope for the project.
    headshot: https://res.cloudinary.com/ajalong/image/upload/c_fill,h_160,w_160,f_auto,q_auto:best/alan.design/linkedin/1516943250671
    linkedin: https://www.linkedin.com/in/lisapink/
  - name: Jonathan Kappler
    role: Data & Analytics Product Owner
    company: Mercedes-Benz
    description: |
      A senior stakeholder at Mercedes-Benz who provided strategic input throughout the project. Participated in design workshops led by Interbrand.
    headshot: https://res.cloudinary.com/ajalong/image/upload/c_fill,h_160,w_160,f_auto,q_auto:best/alan.design/linkedin/1711127182920
    linkedin: https://www.linkedin.com/in/jonathan-kappler-67498294/
  - name: James Hutchinson
    role: Data Operations Manager
    company: OMD
    description: |
      A stakeholder from one of Interbrand's sister agencies, OMD, who was part of the team that had originally created the Mercedes Decision Engine. Participated in design workshops led by Interbrand.
    headshot: https://res.cloudinary.com/ajalong/image/upload/c_fill,h_160,w_160,f_auto,q_auto:best/alan.design/linkedin/1774910332352
    linkedin: https://www.linkedin.com/in/jrohutch/
---

_Context_

## Overhauling Mercedes-Benz's ad analytics platform

The Media Decision Engine is Mercedes-Benz's paid media analytics platform, used to track, measure, and optimise advertising performance across all paid media channels. The platform had been built by [OMD](https://www.omd.com/) (one of Interbrand's sister agencies) and grown in capability over the years without dedicated product design input; Interbrand was brought in to overhaul it.

_Problem_

## A powerful platform obscured by its interface

The Media Decision Engine was a capable platform held back by its interface.

- **Information architecture.** The platform never properly explained itself. Users struggled to understand what it was for and what each individual tool did.
- **Inconsistency across tools.** Each tool had been built in isolation. Flows, interaction patterns, and data visualisation all varied from tool to tool, forcing users to re-learn the interface every time they switched.
- **Exporting data.** Export formats were limited, and there was no way to batch exports across multiple tools, forcing users to repeat the same task tool by tool.

_Research_

## Understanding the platform

Niq Curry led user research and developed personas that anchored the redesign. Separately, we interviewed OMD, who had originally built the platform, to understand the constraints that shaped it. I then co-facilitated a day-long London workshop with Mercedes-Benz's team, who flew in from Stuttgart, walking them through personas, user needs, and pain points before opening up to ideation.

_Design sprints_

## Three sprints in series

The three problem areas were tackled as separate design sprints, run in series so each built on the last.

_Information architecture_

### Grouping tools around the user's process

The original platform was organised around the tools themselves. The redesign organised them around the user's process.

Tools were regrouped into three stages that mirrored how users actually moved through a media planning decision: looking for market opportunities in existing data; determining the audience and focus of messaging; then setting the overall budget and allocating it across media channels.

Within each stage, tools were laid out down a single page, in the order users would naturally work through them. Putting related tools next to each other made the relationships between them self-evident, so users no longer had to reconstruct the logic of the platform in their heads.

!["Identify Market Trends": multi-year registration lines (Mercedes vs Audi vs Other), settings bar, Market Landscape tab.](mercedes-market_trends_aasyii.png "The Market Opportunities stage of the IA, showing tools laid out in the order users move through them.")

_Configuring parameters_

### Global settings, adjustable anywhere

Users had been re-entering the same data into tool after tool. The redesign separated parameters that needed to be shared across tools from those that were tool-specific, so global settings could be configured once.

- **Global vs. local parameters.** I scoped every parameter as either global (applied across multiple tools) or local (relevant to a single tool). Globals were consolidated into a single Scenario Settings overlay, accessible from anywhere on the platform. Local parameters stayed within their tool, configurable in place.
- **Pre-populated visualisations.** With globals managed centrally, graphs and other visualisations could update live as users adjusted scenarios, showing them what a parameter did rather than explaining it.
- **Microcopy rewritten platform-wide.** All in-product copy was rewritten to be short and plain, lowering cognitive load and making the relationships between tools more legible.
- **Exports unified across tools.** Users could export from any tool using the same flow, and select multiple tools for batch export, removing the repetition the old platform had forced on them.

The result was a platform where content throughout the site reacted to global scenario changes, rather than a collection of discrete tools.

![Modal over chart: Scenario tab, dropdowns (market, model, competitors, segment, fuel, timeframe), saved scenario cards, Reset and Update.](mercedes-settings_nfcco6.png "The Scenario Settings overlay. Adjusting any global parameter updates visualisations across every tool live.")

![Dark nav, filter chips, line chart of spend vs outcome by channel, right rail with budget split, CO2 figures, export.](mercedes-channel_optimisation_naza6q.png "Channel Optimisation: spend versus impact across paid media channels, with budget allocation in the right rail.")

_Onboarding_

### A guided introduction for less experienced users

The first two sprints had done a lot of the onboarding work. A clearer information architecture and live, demonstrative scenarios meant the platform now explained itself in ways the old one couldn't. The onboarding sprint focused on the gap that remained, particularly for users less familiar with media analytics.

- **A short guided tour on first use.** A brief upfront orientation to the platform's structure and the logic behind it.
- **Tooltips and nudges, used sparingly.** Tied to specific moments where users were most likely to need a prompt, with copy kept short.
- **Copy pitched to the audience.** Onboarding copy assumed a working knowledge of media analytics and avoided the explanatory hand-holding that often makes onboarding feel patronising to expert users.

![First-use orientation overlay highlighting the IA's three stages.](mercedes-overlay_fmo5gj.png "The first-use orientation, kept short because the IA had already done most of the work.")

![Login screen with platform purpose statement above the form.](mercedes-login_dqkdm1.png "The login screen sets expectations for who the platform is for, before the user has logged in.")

_Impact_

## A powerful platform that explains itself

Final designs were delivered to Mercedes-Benz in spring 2025, with implementation underway in the months that followed. The redesigned Media Decision Engine turned a capable but hard-to-use platform into one that worked with its users rather than against them. The platform was clearer in structure and more consistent in behaviour, and required less prior knowledge to navigate.

_Lessons learned_

## Redesigning inside a working product

- **Running sprints in series rather than parallel multiplies their value.** Running information architecture, global scenario settings, and onboarding sprints in parallel would have produced three competent solutions. Running each one after the other produced one coherent platform, because each sprint inherited the structural decisions of the last. The cost was time; the gain was a redesign that held together as one product.
- **Insights from the original creators are invaluable.** The OMD interviews were the most valuable research input we had. They did not validate decisions; they exposed the constraints that we would otherwise have rediscovered the hard way.
