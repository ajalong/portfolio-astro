---
title: Onboarding UX refinement
client: Tradu
slug: tradu
summary: A token-driven light mode and UX refinements for a fintech onboarding flow.
metaDescription: A token-driven light mode for Tradu's onboarding flow, followed by a UX audit that built on the same primitive token foundation.
thumbnailImage: https://res.cloudinary.com/ajalong/image/upload/f_auto,q_auto:best,c_limit,w_800/v1777807570/alan.design/tradu/tradu-thumbnailImage_yo7krq.png
thumbnailVideo: https://res.cloudinary.com/ajalong/video/upload/f_auto,q_auto,c_limit,w_1600,e_fade:1200/e_fade:-1200/v1777807484/alan.design/tradu/tradu-thumbnailVideo_ren8b8.mp4
order: 2
year: 2025
sector: Fintech
brand:
  primary: "#DC6FB8"
  secondary: "#A172DA"
roleTitle: Lead Product Designer
roleSummary: |
  Sole external designer on Tradu's onboarding flow, working independently from their in-house team. Designed a light mode for the flow, built on a primitive token foundation. After the light mode work, scope expanded into a UX audit of the onboarding flow and the corporate site.
team:
  - name: Alan Long
    role: Lead Product Designer, Onboarding
    company: Interbrand
    description: |
      Sole external designer on Tradu's onboarding flow. Designed a light mode for the flow built on a primitive token foundation, then audited and improved its UX.
    headshot: https://res.cloudinary.com/ajalong/image/upload/c_fill,h_160,w_160,f_auto,q_auto/alan.design/headshot-edited.jpg
    linkedin: https://linkedin.com/in/alanalberglong
  - name: Alex Toomey
    role: Lead Product Designer, Corporate site
    company: Interbrand
    description: |
      Led the design system and corporate site work for Tradu, with my onboarding workstream running after hers.
    headshot: https://res.cloudinary.com/ajalong/image/upload/c_fill,h_160,w_160,f_auto,q_auto:best/v1777807983/alan.design/linkedin/alex_toomey-headshot_bgkwnn.jpg
    linkedin: https://www.linkedin.com/in/alex-toomey-584a76b4/
  - name: Lisa Pink
    role: Project Manager
    company: Interbrand
    description: |
      Provided project management across the Tradu engagement, handling scheduling, scope, and the formal statements of work as the engagement expanded.
    headshot: https://res.cloudinary.com/ajalong/image/upload/c_fill,h_160,w_160,f_auto,q_auto:best/alan.design/linkedin/1516943250671
    linkedin: https://www.linkedin.com/in/lisapink/
---

_Context_

## The entry point for every new Tradu customer

Tradu is a UK trading and investing platform owned by Jefferies Financial Group. Their product is a mobile-first web app, and onboarding is the entry point for every new customer.

When I joined the project, Alex Toomey and Lisa Pink had been working with Tradu on the broader design system and corporate site. My focus was the onboarding flow itself, with Lisa providing project management.

_Problem_

## Adding light mode to an existing system

The brief was to design a light mode for the onboarding flow. The existing dark-mode design system used colour values directly rather than abstracted into primitive tokens, which meant a light mode could either be built ad-hoc by inverting values screen by screen, or by rebuilding the colour foundation as primitives that both modes could derive from. The first option would have been faster but would not have scaled. The second would extend as the system grew.

_Design & UX audit_

## The design system, refined and extended

The initial brief was to implement light mode for onboarding. Tradu were impressed with the work delivered and extended the brief to cover a broader UX audit of the product onboarding and the corporate site.

I established a token-based approach to the design system, allowing for a smooth adoption of a light mode without compromising the existing dark mode. Then, in conducting the UX audit, I walked through the designs systematically, identifying refinements that would improve usability and reduce friction across onboarding and the corporate site.

_Light mode_

### Light mode

I rebuilt the colour foundation as a set of primitive tokens, working back from the existing dark mode to identify the values in use and abstract them into a base scale from black to white, alongside primitive tokens for the brand accents. The existing dark mode was then mapped to these primitives, and a light mode was derived as the inverse: surfaces moved from dark tones to light tones, text from light to dark, and so on. The systematic approach meant the light mode was internally consistent rather than the result of value-by-value judgement calls. The work covered the full onboarding flow, ultimately converting 19 screens and 46 component states from dark to light mode.

![The primitive token scale, showing dark-mode and light-mode tokens derived as inversions from the same base.](/placeholder-16x9.svg)

Two specific decisions sat on top of the systematic inversion.

The first concerned Tangerine, Tradu's primary accent colour. The brand guidelines specified a slightly darker shade of Tangerine for use in light mode, intended to support accessibility. The alternative shade still passed AA contrast against white text, but only by a narrow margin, and the result was a less visually consistent system across modes. I recommended retaining the standard Tangerine in both modes, with black text used over it consistently to meet AA contrast. The accessibility outcome was stronger and the system stayed unified across modes.

![Comparison of the standard Tangerine shade and the lighter Tangerine shade specified for light mode, showing both passing AA contrast against black text but the lighter shade only marginally.](/placeholder-16x9.svg)

The second concerned selected states. A direct dark-to-light inversion left selected states under-distinguished from default states in light mode. Rather than copy the dark-mode treatment, I proposed using Tangerine to mark selection across radio buttons, multi-select buttons, and text fields. The accent did clearer work in light mode than the equivalent dark-mode treatment, where the dark surrounds had given a subtle indicator enough definition.

![Selected states in light mode shown twice over, first using black as the indicator and then using Tangerine, across radio buttons, multi-select buttons, and text fields. Tangerine produces clearer visual separation in the lighter environment.](https://res.cloudinary.com/ajalong/image/upload/f_auto,q_auto:best,c_limit,w_1800/v1778082758/alan.design/tradu/tradu-field_states_scoji5.png)

_Form-state distinction_

### Form-state distinction

Field states across the flow had been treated inconsistently between modes, with default, selected, filled, and disabled states using visual treatments that did not always read as distinct. I redesigned the state set so each was unambiguous in both light and dark mode. The changes were defined as system tokens so they propagated across the flow.

![Field states in dark and light mode, showing the four treatments (default, selected, filled, disabled) redesigned to be unambiguously distinct from each other.](/placeholder-16x9.svg)

_Progress bar relocation_

### Progress bar relocation

The progress bar sat inside the top app bar, competing with navigation controls and adding visual complexity to the area users looked to for orientation. I explored several alternative positions and treatments, ultimately recommending the progress bar be placed alongside the primary action button at the bottom of the screen. The change simplified the top app bar and grouped the progress signal with the action that advanced it.

![Progress bar variants explored, with compact top-of-screen treatments to placements grouped with the primary action button at the bottom.](https://res.cloudinary.com/ajalong/image/upload/f_auto,q_auto:best,c_limit,w_1800/v1778082762/alan.design/tradu/tradu-progress_bar_ohs6p0.png)

_Single-select pattern_

### Single-select pattern

The existing single-select lists used radio buttons that required a confirmation tap on a separate button. This added an unnecessary tap on every single-select question in the onboarding flow. I recommended a pattern where tapping the option itself advanced the flow, removing the confirmation step. The change removed an unnecessary step on a long flow.

![The existing single-select pattern using radio buttons and a confirmation tap, compared with a proposed pattern where tapping the option itself advances the flow.](/placeholder-16x9.svg)

_Top app bar actions_

### Top app bar actions

Concerns had been raised about the visibility of top app bar actions. I researched comparable patterns on Android Material 3 and iOS, then proposed a Tradu top app bar that drew from Material 3 conventions for icon spacing and sizing while remaining within the existing system. The result improved action visibility without breaking platform conventions.

![Three top app bar treatments compared: the existing design, an action backgrounds variant, and a Material 3-inspired variant with revised icon spacing and sizing.](/placeholder-16x9.svg)

_Corporate site_

### The corporate site

The engagement expanded further with a UX audit of the corporate site. The work surfaced a set of refinements to typography, button sizing, and contrast across sections. The deliverable was a Figma file with annotations indicating recommended changes against the existing designs, alongside variant explorations for several sections.

![Final recommendations from a UX audit of the corporate site.](https://res.cloudinary.com/ajalong/image/upload/f_auto,q_auto:best,c_limit,w_1800/v1778082768/alan.design/tradu/tradu-site_tweaks_xnoedj.png)

_Impact_

## Implemented and extended

The light mode work was implemented across the onboarding flow. The audit recommendations followed in subsequent releases. The Tradu product team referenced the Figma file directly during implementation, using it as the source of truth for the changes.

What began as a one-week brief for light mode expanded across formal statements of work into the full UX audit and the corporate site engagement. The team's confidence in the work drove the expansion, with each phase building on the previous one.

_Lessons learned_

## Operating inside an existing system

- **Token-driven thinking applies in both directions.** The foundation work I had developed at GSK started from primitive tokens upwards. Tradu's existing dark mode had to be reverse-engineered into primitives that could then support light mode. The same systematic approach worked, but applied backwards: identifying the values in use, abstracting them, and re-deriving the original from the abstraction.
- **Accessibility decisions sometimes require pushing back on brand guidelines.** The Tangerine recommendation went against the brand specification for light mode. The brand team had specified the alternative shade in good faith, but the accessibility outcome was stronger when the standard Tangerine was retained with black text. The lesson is about being willing to make that call constructively, rather than treating brand guidelines as absolute.
- **Strong foundations earn an extended engagement.** The original brief was one week of work on light mode for onboarding. The engagement extended through formal statements of work into a full UX audit of onboarding and the corporate site. Each expansion was a function of the systematic approach holding up at the previous stage.
