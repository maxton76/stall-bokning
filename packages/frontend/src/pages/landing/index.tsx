import LandingHeader from "./LandingHeader";
import HeroSection from "./HeroSection";
import FeaturesSection from "./FeaturesSection";
import ModulesSection from "./ModulesSection";
import DocumentationSection from "./DocumentationSection";
import TestimonialsSection from "./TestimonialsSection";
import PricingSection from "./PricingSection";
import CTASection from "./CTASection";
import LandingFooter from "./LandingFooter";

const LandingPage = () => {
  return (
    <>
      <LandingHeader />
      <main>
        <HeroSection />
        <FeaturesSection />
        <ModulesSection />
        <DocumentationSection />
        <TestimonialsSection />
        <PricingSection />
        <CTASection />
      </main>
      <LandingFooter />
    </>
  );
};

export default LandingPage;
