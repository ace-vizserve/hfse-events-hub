import type { ReactNode } from 'react';
import { AdminNav, SignOutButton } from '@/components/AdminNav';

// Shell only. Each page below checks access itself, since layouts do not re-run on navigation.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <aside>
        <div className="brand">HFSE<span> •</span></div>
        <div className="brand-sub">INTERNATIONAL SCHOOL</div>
        <div className="navlabel">EVENTS WORKSPACE</div>
        <AdminNav />
        <div className="aside-foot">
          <b>Every detail. Every milestone.</b><br />
          Bringing our HAPI community together.<br />
          <span style={{ color: '#3453eb' }}>Academic Year 2027</span>
        </div>
      </aside>
      <main>
        <header>
          <div className="crumb">HFSE Workspace &nbsp; / &nbsp; <b style={{ color: '#182442' }}>Events Hub</b></div>
          <div>
            <span className="pill">AY2027</span>
            <span className="avatar">HF</span>
            <SignOutButton />
          </div>
        </header>
        <div className="content">{children}</div>
      </main>
    </>
  );
}
