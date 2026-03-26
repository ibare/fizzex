import HeroSection from './home/HeroSection';
import ProblemSection from './home/ProblemSection';
import PipelineSection from './home/PipelineSection';
import FeaturesSection from './home/FeaturesSection';
import ComparisonSection from './home/ComparisonSection';
import QuickStartSection from './home/QuickStartSection';
import PluginSection from './home/PluginSection';
import FooterCTASection from './home/FooterCTASection';

export default function Home() {
  return (
    <>
      <HeroSection />
      <ProblemSection />
      <PipelineSection />
      <FeaturesSection />
      <ComparisonSection />
      <QuickStartSection />
      <PluginSection />
      <FooterCTASection />
    </>
  );
}
