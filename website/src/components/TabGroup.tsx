interface TabGroupProps {
  tabs: string[];
  activeIndex: number;
  onChange: (index: number) => void;
}

export default function TabGroup({ tabs, activeIndex, onChange }: TabGroupProps) {
  return (
    <div className="tabs">
      {tabs.map((label, i) => (
        <button
          key={label}
          className={`tabs__tab${i === activeIndex ? ' tabs__tab--active' : ''}`}
          onClick={() => onChange(i)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
