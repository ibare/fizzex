import HeroSection from './home/HeroSection';
import ProblemSection from './home/ProblemSection';
import PipelineSection from './home/PipelineSection';
import FeaturesSection from './home/FeaturesSection';
import ChemistrySection from './home/ChemistrySection';
import UnderTheHoodSection from './home/UnderTheHoodSection';
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
      <ChemistrySection />
      <UnderTheHoodSection />
      <QuickStartSection />
      <PluginSection />
      <FooterCTASection />
    </>
  );
}
