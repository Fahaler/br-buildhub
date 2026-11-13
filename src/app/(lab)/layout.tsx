import './lab.css'

// Макеты нового дизайна: свои стили, без бокового меню основного сайта.
export default function LabLayout({ children }: { children: React.ReactNode }) {
  return <div className="lab-root">{children}</div>
}
