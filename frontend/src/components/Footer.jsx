import { Code2 } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <span className="footer-credit">
          <Code2 size={14} />
          Designed & Developed by <strong>UMAR KHAN</strong>
        </span>
        <span className="footer-copy">© {new Date().getFullYear()} Ultra Cloud. All rights reserved.</span>
      </div>
    </footer>
  );
}
