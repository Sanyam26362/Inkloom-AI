"use client";

import React from "react";
import { Header } from "@/components/sections/Header";
import { Hero } from "@/components/sections/Hero";
import { Section1_Logos } from "@/components/sections/Section1_Logos";
import { Section2_CookieBanner } from "@/components/sections/Section2_CookieBanner";
import { Section3_Testimonial } from "@/components/sections/Section3_Testimonial";
import { Section4_DividerBottleneck } from "@/components/sections/Section4_DividerBottleneck";
import { Section5_WorkflowSteps } from "@/components/sections/Section5_WorkflowSteps";
import { Section6_DividerFixMistakes } from "@/components/sections/Section6_DividerFixMistakes";
import { Section7_AiUpgrade } from "@/components/sections/Section7_AiUpgrade";
import { Section8_DividerAudience } from "@/components/sections/Section8_DividerAudience";
import { Section9_RolesGrid } from "@/components/sections/Section9_RolesGrid";
import { Section10_DividerCompliance } from "@/components/sections/Section10_DividerCompliance";
import { Section11_Checkpoint } from "@/components/sections/Section11_Checkpoint";
import { Section12_DemoConsultation } from "@/components/sections/Section12_DemoConsultation";
import { Section13_ProjectManager } from "@/components/sections/Section13_ProjectManager";
import { Section14_Creatives } from "@/components/sections/Section14_Creatives";
import { Section15_Stakeholders } from "@/components/sections/Section15_Stakeholders";
import { Section16_Integrations } from "@/components/sections/Section16_Integrations";
import { Section17_Security } from "@/components/sections/Section17_Security";
import { Section18_Faq } from "@/components/sections/Section18_Faq";
import { Section19_Awards } from "@/components/sections/Section19_Awards";
import { Section20_FinalCta } from "@/components/sections/Section20_FinalCta";
import { Section21_Footer } from "@/components/sections/Section21_Footer";
import { Section22_Copyright } from "@/components/sections/Section22_Copyright";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-[#374151] font-['Lato',sans-serif] selection:bg-[#ffe29f] selection:text-[#111827]">
      {/* 1. header */}
      <Header />

      <main className="w-full">
        {/* 2. hero */}
        <Hero />

        {/* 3. section-1: Social Proof Logos */}
        <Section1_Logos />

        {/* 4. section-2: Cookie Consent Banner */}
        <Section2_CookieBanner />

        {/* 5. section-3: Customer Testimonial Carousel */}
        <Section3_Testimonial />

        {/* 6. section-4: Section Divider - Approval Bottleneck */}
        <Section4_DividerBottleneck />

        {/* 7. section-5: 3-Step Workflow Breakdown */}
        <Section5_WorkflowSteps />

        {/* 8. section-6: Section Divider - Fix Mistakes Instantly */}
        <Section6_DividerFixMistakes />

        {/* 9. section-7: AI Review Upgrade & Error Detection */}
        <Section7_AiUpgrade />

        {/* 10. section-8: Section Divider - Target Audience */}
        <Section8_DividerAudience />

        {/* 11. section-9: Team Roles Grid */}
        <Section9_RolesGrid />

        {/* 12. section-10: Section Divider - Compliance */}
        <Section10_DividerCompliance />

        {/* 13. section-11: Trust Layer & Audit Trails */}
        <Section11_Checkpoint />

        {/* 14. section-12: 30-Minute Consultation / Demo */}
        <Section12_DemoConsultation />

        {/* 15. section-13: Project Manager & Marketer Overview */}
        <Section13_ProjectManager />

        {/* 16. section-14: Creatives Focus Section */}
        <Section14_Creatives />

        {/* 17. section-15: Stakeholder Feedback Section */}
        <Section15_Stakeholders />

        {/* 18. section-16: Integrations Ecosystem */}
        <Section16_Integrations />

        {/* 19. section-17: Security & Confidentiality */}
        <Section17_Security />

        {/* 20. section-18: Frequently Asked Questions */}
        <Section18_Faq />

        {/* 21. section-19: G2 & Industry Awards Social Proof */}
        <Section19_Awards />

        {/* 22. section-20: Final Conversion CTA */}
        <Section20_FinalCta />
      </main>

      {/* 23. section-21: Footer Navigation */}
      <Section21_Footer />

      {/* 24. section-22: Copyright & Legal Footnote */}
      <Section22_Copyright />
    </div>
  );
}
