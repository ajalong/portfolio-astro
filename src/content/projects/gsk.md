---
title: Core Design System
client: GSK
slug: gsk
summary: A company-wide design system to make GSK's bold new brand accessible across all digital products.
metaDescription: In response to accessibility and technical challenges with GSK's 2022 rebrand, I designed a core digital design system that could be adopted across the company, balancing expressive brand content with dense tools for healthcare professionals.
thumbnailImage: https://res.cloudinary.com/ajalong/video/upload/f_auto,q_auto:best,c_limit,w_800,so_0/alan.design/gsk/wolffolins/WolffOlins_GSK_CaseStudy_16_hfms2k.jpg
thumbnailVideo: https://res.cloudinary.com/ajalong/video/upload/f_auto,q_auto,c_limit,w_1600/alan.design/gsk/wolffolins/WolffOlins_GSK_CaseStudy_16_hfms2k.mp4
order: 1
year: 2024
sector: Design System
brand:
  primary: '#FFB600'
  secondary: '#F36633'
roleSummary: |
  Designed and led the adoption of GSK's first company-wide design system, from audit through to initial release. Defined the system architecture, built the core component library and the iOS and Android extensions, and resolved the rebrand's accessibility issues. Ran the cross-team working group whose buy-in carried the system into each product team at rollout.
team:
  - name: Alan Long
    role: Lead Product Designer
    company: Interbrand
    description: |
      Designed and led the adoption of GSK's first company-wide design system, including the core component library, iOS and Android extensions, and accessibility resolved at the token layer. Ran the cross-team working group that carried the system into each product team at rollout.
    headshot: https://res.cloudinary.com/ajalong/image/upload/c_fill,h_160,w_160,f_auto,q_auto/alan.design/headshot-edited.jpg
    linkedin: https://linkedin.com/in/alanalberglong
  - name: Damaris Homo
    role: Account Manager
    company: Interbrand
    description: |
      Managed the timeline and the budget to ensure the project stayed on course. Provided guidance on what was in scope for the project.
    headshot: https://res.cloudinary.com/ajalong/image/upload/c_fill,h_160,w_160,f_auto,q_auto:best/alan.design/linkedin/1704204410169
    linkedin: https://www.linkedin.com/in/damaris-homo-35027031/
  - name: Anna Morrison
    role: Senior Brand Manager
    company: GSK
    description: |
      Led the project from within GSK. Provided general support and project management, meeting with me several times a week. Introduced me to key stakeholders throughout GSK and organised milestone meetings in which we presented the project progress.
    headshot: https://res.cloudinary.com/ajalong/image/upload/c_fill,h_160,w_160,f_auto,q_auto:best/alan.design/linkedin/anna-morrison
  - name: Rowan Green
    role: Director, Brand Identity (Global Brand)
    company: GSK
    description: |
      Provided creative oversight in relation to GSK's brand. Since he was involved in the creative direction of GSK's rebrand, he was invaluable in making sure the design system was visually aligned with the brand.
    headshot: https://res.cloudinary.com/ajalong/image/upload/c_fill,h_160,w_160,f_auto,q_auto:best/alan.design/linkedin/1766142802851
    linkedin: https://www.linkedin.com/in/rowan-green/
  - name: Phillipa Proctor
    role: Head of Brand Identity and Content Production
    company: GSK
    description: |
      Provided strategic oversight in relation to GSK's brand. Since she was involved in the strategic direction of GSK's rebrand, she was invaluable in making sure the design system was strategically aligned with the brand.
    headshot: https://res.cloudinary.com/ajalong/image/upload/c_crop,h_580,w_700,x_50,y_0/c_fill,h_160,w_160,f_auto,q_auto:best/alan.design/linkedin/phillipa-proctor
    linkedin: https://www.linkedin.com/in/phillipa-proctor/
  - name: Jon Warden
    role: Global Director, Product and UX & Design
    company: GSK
    description: |
      Represented the needs of GSK's largest product team, ensuring the design system was practical and effective for those using it daily. His guidance and sign-off during milestone reviews were essential for aligning the system with leadership's goals.
    headshot: https://res.cloudinary.com/ajalong/image/upload/c_fill,h_160,w_160,f_auto,q_auto:best/alan.design/linkedin/1740951436311
    linkedin: https://www.linkedin.com/in/jonwarden/
---

_Context_

## An accessible design system for big biopharma

In 2022 GSK rebranded with Wolff Olins as they spun off their consumer business, focusing on bold forms and striking scientific imagery. As a FTSE 100 biopharma with digital touchpoints spanning brand sites, scientific tools for healthcare professionals, and internal platforms, GSK needed a design system that could carry the new identity across all of them.

![GSK employees on the Living Gradient created by Wolff Olins.](https://res.cloudinary.com/ajalong/image/upload/f_auto,q_auto:best,c_fill,ar_1.0,w_900/alan.design/gsk/wolffolins/G015A6N_qtqi8k.jpg)

_Problem_

## A bold rebrand that didn't work digitally

The rebrand's digital problems went beyond the cosmetic.

- The new identity worked for brand-led experiences but not for specialist tools used by scientists and healthcare professionals.
- Accessibility issues with the new identity, particularly around colour.
- No shared design system across GSK's digital products, leaving them inconsistent with each other and with the brand.

_System architecture_

## Tokens, accessibility, and brand alignment by default

An audit of the 2022 rebrand guidelines revealed they lacked the necessary foundations for digital. Rather than adapt them, I rebuilt the system from the ground up, sitting at the core of GSK's brand with print and specialised guidelines radiating from it. The system was designed from the perspective of the teams who would adopt it: documentation accompanies every guideline, and accessibility is built into its foundations.

- **Built on design tokens** so the system adapts across devices, platforms and colour modes.
- **Accessibility resolved at the token and component level**, so every adopting team inherited it by default.
- **A lean core component set** covering only what could be truly generalised across GSK, so teams build on it rather than be confined by it.
- **Native iOS and Android extensions** of the core library, giving native teams the building blocks to align with each platform's UX paradigms.

![The system's token hierarchy: primitive tokens at the base, semantic tokens mapping intent, components built from semantic tokens. Accessibility is resolved at the primitive layer so every adopting team inherits it by default.](https://placeholder.invalid/TODO-token-hierarchy-diagram.png)

![Core UI components, for example a toggle switch, in light and dark mode from the design system.](https://res.cloudinary.com/ajalong/video/upload/w_auto,c_fill,q_auto,f_auto,fl_animated/alan.design/gsk/gskdesignsystem_general_components.mp4)
![A GSK podcast iOS app built from design system components in light and dark mode.](https://res.cloudinary.com/ajalong/video/upload/w_auto,c_fill,q_auto,f_auto,fl_animated/alan.design/gsk/gskdesignsystem_podcasts.mp4)

_Implementation_

## Shipping, proving, and supporting adoption

Shipping the system was just the start. The work that followed was making sure it took hold across GSK's product teams.

- **Designed Brandhub from the new system**, GSK's internal brand site, as the system's flagship application. The system also informed updates to gsk.com as it rolled out across the corporate site.
- **A working group of product team representatives** shaped requirements during research and drove adoption inside their teams during rollout.
- **Workshops** to surface requirements during research and demystify tokens during rollout, helping teams new to the approach work with the system.

![GSK Brandhub, the company's internal brand guidelines hub, built using the core design system.](https://res.cloudinary.com/ajalong/image/upload/f_auto,q_auto:best,c_limit,w_1800/alan.design/gsk/gskdesignsystem_brandhub.png)

![gsk.com refined through the new system as it rolled out across the corporate site.](https://res.cloudinary.com/ajalong/image/upload/f_auto,q_auto:best,c_limit,w_1800/alan.design/gsk/gskdesignsystem_corpsite.png)

_Impact_

## A strong reception and growing adoption

The system is doing what it was built to do. Accessibility issues are resolved, adoption is spreading across GSK's digital teams, and the response from product and brand teams has been strong.

- Accessibility issues resolved, unblocking digital adoption of the 2022 rebrand.
- Rolling out company-wide across GSK's digital teams following the initial release.
- Proved the system in production on gsk.com and GSK Brandhub.

_Lessons learned_

## Systematising design for a large organisation

A few things became clear over the course of the project. Most of them came down to recognising that a design system is as much an organisational product as a design one. Its success depends as much on how it fits into the company around it as on how well it is built.

- **A focus on scope enabled strong adoption.** A smaller set of well-considered components gave teams room to build on the system rather than fight against it.
- **Accessibility has to live at the token layer.** Fixing issues at the root meant every adopting team inherited the fixes without extra work.
- **Stakeholder workshops are adoption work as much as research.** They built the internal advocacy network that carried the system into each product team at rollout.
- **Brand and design system work is best done together.** Co-authoring the system with GSK's brand leadership meant decisions were made collaboratively throughout the project, rather than reviewed only at the point of sign-off.

> "Receiving so much positive feedback already, people are really impressed with how good all is – Thank you so much Interbrand!"
>
> — Anna Morrison, GSK Senior Brand Manager
