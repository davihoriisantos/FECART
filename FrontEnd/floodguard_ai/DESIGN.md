---
name: FloodGuard AI
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#45464d'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#00668a'
  on-secondary: '#ffffff'
  secondary-container: '#40c2fd'
  on-secondary-container: '#004d6a'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#271901'
  on-tertiary-container: '#98805d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#c4e7ff'
  secondary-fixed-dim: '#7bd0ff'
  on-secondary-fixed: '#001e2c'
  on-secondary-fixed-variant: '#004c69'
  tertiary-fixed: '#fcdeb5'
  tertiary-fixed-dim: '#dec29a'
  on-tertiary-fixed: '#271901'
  on-tertiary-fixed-variant: '#574425'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style

The design system is engineered for **FloodGuard AI**, a high-stakes flood prediction platform. The brand personality is rooted in **Reliability, Precision, and Innovation**. It must evoke a sense of calm authority and technical sophistication, ensuring users feel safe and informed during critical decision-making moments.

The design style follows a **Modern Corporate** aesthetic with a **Data-Driven** focus. It utilizes high-contrast typography, a systematic grid, and subtle depth to organize complex environmental data without overwhelming the user. The interface is intentionally clean, prioritizing information density and legibility to serve government agencies, emergency responders, and infrastructure planners.

## Colors

This design system utilizes a sophisticated palette of deep technology blues to establish a professional foundation. 

- **Primary & Foundations:** The primary colors (#0F172A and #1E293B) provide a sturdy, high-contrast base for text and navigation. Backgrounds rely on pure white and a cool light gray (#F8FAFC) to maintain a sense of space and cleanliness.
- **Semantic Alert Scale:** A strict four-tier color system is used for risk assessment. These colors must only be used for status indicators, alerts, and data visualization to prevent cognitive fatigue.
- **Accents:** A secondary "Sky Blue" (#38BDF8) is introduced for interactive elements like links and primary actions to differentiate them from the deep structural blues.

## Typography

The design system uses **Inter** exclusively to ensure maximum readability across technical dashboards and mobile alerts. 

- **Scale & Hierarchy:** The system uses a tight scale where headlines use semi-bold and bold weights to anchor the page. 
- **Readability:** Line heights are generous (150% for body text) to assist with rapid data scanning during high-stress scenarios.
- **Labels:** Small labels and data captions utilize a medium weight and slight tracking (letter spacing) to remain legible even at 12px.

## Layout & Spacing

The design system is built on a **4px baseline grid** with a **12-column fluid grid** for desktop and a **4-column grid** for mobile.

- **Grid Logic:** The 12-column layout uses a 24px gutter to maintain clear separation between complex data widgets and map views.
- **Safe Areas:** On mobile, margins are reduced to 16px to maximize the available screen real estate for map-based navigation.
- **Sectioning:** Vertical spacing follows a 1.5x ratio, where section headings are separated from content by 24px (lg), and sections are separated from each other by 48px (2xl).

## Elevation & Depth

Visual hierarchy is managed through **Tonal Layers** and **Ambient Shadows**. This approach keeps the UI light and fast-loading while providing clear physical cues for interactivity.

- **Surfaces:** The base background is light gray (#F8FAFC). Cards and containers are pure white (#FFFFFF) to create a subtle "lift" from the page.
- **Shadows:** Use extremely soft, low-opacity shadows (Blur: 15px, Y: 4px, Color: #0F172A at 4% opacity). Higher elevation levels for modals or active alerts use a more pronounced double-stack shadow to indicate urgency and focus.
- **Outlines:** All containers feature a 1px solid border (#E2E8F0) to ensure crisp definition on high-resolution displays.

## Shapes

The design system adopts a **Rounded** shape language to soften the technical nature of the data and make the platform feel more approachable and modern.

- **Standard Radius:** 0.5rem (8px) for buttons, inputs, and small widgets.
- **Large Radius (2xl):** 1.5rem (24px) for primary containers, dashboard cards, and large imagery.
- **Pill Shapes:** Used exclusively for status chips (e.g., "Active," "Safe") to distinguish them from actionable buttons.

## Components

- **Buttons:** Primary buttons use the deep blue (#0F172A) with white text. Hover states shift to the Sky Blue accent. Secondary buttons use a transparent background with a 1px border.
- **Input Fields:** Fields are outlined with 8px corner radius. Focus states use a 2px Sky Blue ring. Error states use a Red (#EF4444) border and helper text.
- **Status Chips:** These follow the semantic alert scale. They feature a light tinted background (10% opacity) of the semantic color with bold, dark text of the same hue for maximum contrast.
- **Cards:** Dashboard widgets use the 24px (2xl) corner radius. They include a 1px light gray border and a soft ambient shadow to appear "seated" on the light gray background.
- **Alert Banners:** Positioned at the top of the interface, these use the full saturation of the Semantic Alert scale (e.g., solid Red for critical) to ensure they cannot be missed.
- **Data Visualizations:** Charts should utilize the primary deep blue for standard data points, reserving semantic colors strictly for risk thresholds.