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
  primary: "#FFB600"
  secondary: "#F36633"
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

GSK are FTSE 100 biopharma giant with numerous digital products. They span brand-led content for the general public, to scientific tools for industry professionals.

In 2022 they rebranded as they spun off their consumer business. The new identity featured bold forms and striking scientific imagery. GSK came to me needing a core design system that could underpin all their products and services and align them with new identity.

![New GSK logo created by Wolff Olins with DNA Twist and Precision point holding shapes.](https://res.cloudinary.com/ajalong/video/upload/f_auto,q_auto:best,c_limit,w_1600/v1777997705/alan.design/gsk/wolffolins/WolffOlins_GSK_CaseStudy_03_lssslb-2_heywv6.mp4)
![GSK employees on the Living Gradient created by Wolff Olins.](https://res.cloudinary.com/ajalong/image/upload/f_auto,q_auto:best,c_fill,ar_1.0,w_900/alan.design/gsk/wolffolins/G015A6N_qtqi8k.jpg)

![GSK's new brand in action at their London HQ.](https://res.cloudinary.com/ajalong/image/upload/f_auto,q_auto:best,c_limit,w_1800/alan.design/gsk/wolffolins/G0168BT_i3cocf.webp)

_Problem_

## A bold rebrand that didn't work digitally

Bold colour, striking imagery, and expressive typography landed well in consumer-facing marketing material, however across the rest of GSK's digital landscape it presented challenges.

- There were accessibility issues with the new identity, the biggest one being GSK shade of orange failed WCAG AA in some contexts.
- The new identity worked for brand-led experiences but not for specialist tools used by scientists and healthcare professionals.
- There was no existing core design system across GSK's digital products, leaving them inconsistent with each other and with the brand.

_System architecture_

## Tokens, accessibility, and brand alignment

An audit of the 2022 rebrand guidelines revealed they lacked the necessary foundations for digital. Rather than adapt them, I built a system from the ground up based on the intent of the rebrand. Digital would sit at the core of GSK's brand, with print and specialised guidelines radiating from it. The system was designed from the perspective of the teams who would adopt it: documentation accompanies every guideline, and accessibility is built in at a token level.

- **Accessibility resolved at the token level**. A semantic layer abstracted primitive token values so text remained accessible across light and dark mode.
- **Fallback high density grids and typography** for specalist tools. Catered to technical audiences who require information dense interfaces.
- **A lean core component set** covering only what could be truly generalised across GSK, so teams build on it rather than be confined by it.
- **iOS and Android extensions** of the core library, giving native teams the building blocks to align with each platform's UX paradigms.

![Getting Started section of the design system. Explains the core system's role and relationship to product teams' work.](https://res.cloudinary.com/ajalong/image/upload/f_auto,q_auto:best,c_limit,w_1800/alan.design/gsk/gskdesignsystem_gettingstartedframes.png)

![The system's token hierarchy: primitive tokens at the base, semantic tokens mapping intent, components built from semantic tokens. Accessibility is resolved at the primitive layer so every adopting team inherits it by default.](https://placeholder.invalid/TODO-token-hierarchy-diagram.png)

![Core UI components, for example a toggle switch, in light and dark mode from the design system.](https://res.cloudinary.com/ajalong/video/upload/w_auto,c_fill,q_auto,f_auto/alan.design/gsk/gskdesignsystem_general_components.mp4)
![A GSK podcast iOS app built from design system components in light and dark mode.](https://res.cloudinary.com/ajalong/video/upload/w_auto,c_fill,q_auto,f_auto,fl_animated/alan.design/gsk/gskdesignsystem_podcasts.mp4)

_Implementation_

## Shipping, proving, and supporting adoption

Wherever possible I take a participatory approach to design, involving stakeholders in the design process. This approach can be challenging in terms of logistics and ensuring everyone feels they've views have been taken into account, however in this project it played a vital role in accointing for the needs of parties across the buisness and earning their buy in.

- **I formed a working group of indivduals from key product teams** to shape design system requirements. I lead weekly workshops as I built, enabling input from those that would use the system.
- **I worked closely with GSK's brand team** to ensure the design system was aligned with the new brand.
- **I designed Brandhub upon the new system**, GSK's digital asset management and brand guideline platform.

![GSK Brandhub, the company's internal brand guidelines hub, built using the core design system.](https://res.cloudinary.com/ajalong/image/upload/f_auto,q_auto:best,c_limit,w_1800/alan.design/gsk/gskdesignsystem_brandhub.png)

![gsk.com refined through the new system as it rolled out across the corporate site.](https://res.cloudinary.com/ajalong/image/upload/f_auto,q_auto:best,c_limit,w_1800/alan.design/gsk/gskdesignsystem_corpsite.png)

_Impact_

## A strong reception and growing adoption

The system is doing what it was built to do. Accessibility issues are resolved, adoption is spreading across GSK's digital teams, and the response from product and brand teams has been strong.

- **Accessibility issues resolved**, unblocking digital adoption of the 2022 rebrand.
- **Rolling out company-wide** across GSK's digital teams following the initial release.
- **Proved the system in production** on gsk.com and GSK Brandhub.

_Lessons learned_

## Systematising design for a large organisation

Initally the scope of this project was daunting however through collaboration with stakeholders, management of the system's scope and usage of tokens to tackle accessibility, it was hugely sucessful.

This project also presented a unique oppertunity to align product teams that, due to GSK's corporate structure, had been opperating indipendently. Leading this effort taught me a great deal about how you balence the competing needs of many stakeholders.

- **Stakeholder workshops build buy in.** They built the internal advocacy network that carried the system into each product team at rollout.
- **A focus on scope enabled strong adoption.** A smaller set of well-considered components gave teams room to build on the system rather than fight against it.
- **Accessibility has to live at the token layer.** Fixing issues around colour at the token layer meant every adopting team inherited the fixes without extra work.
- **Brand and design system work is best done together.** Co-authoring the system with GSK's brand team meant decisions were made collaboratively throughout the project, rather than reviewed only at the point of sign-off.

> "Receiving so much positive feedback already, people are really impressed with how good all is – Thank you so much Interbrand!"
>
> — Anna Morrison, GSK Senior Brand Manager
