import * as Menu from '@radix-ui/react-dropdown-menu';
import { useEffect, useRef, useState } from 'react';
import { ChevronUp, LogOut, Moon, Sun, UserRound } from 'lucide-react';
import { Button } from './ui/Button';
export function ProfileMenu({ email, dark, onTheme, onAccount, onLogout }: {
  email?: string; dark: boolean; onTheme: () => void; onAccount?: () => void; onLogout?: () => void;
}) {
  const anchor = useRef<HTMLDivElement>(null);
  const [container, setContainer] = useState<HTMLElement>();
  useEffect(() => { setContainer(anchor.current?.closest('dialog') ?? undefined); }, []);
  return <div className="sidebar-account" ref={anchor}>
    <div className="account profile-account">
      <Menu.Root>
        <Menu.Trigger asChild>
          <button className="profile-trigger" aria-label="Öppna profilmeny">
            <span className="avatar">{email?.slice(0, 2).toUpperCase() || 'DU'}</span>
            <span className="account-copy"><strong>Ditt konto</strong><small title={email}>{email || 'Personlig workspace'}</small></span>
            <ChevronUp size={14} className="profile-chevron" />
          </button>
        </Menu.Trigger>
        <Menu.Portal container={container}>
          <Menu.Content className="profile-menu" side="top" align="start" sideOffset={12} collisionPadding={12}>
            <Menu.Label className="profile-menu-heading"><span className="profile-brand">OpenCancer</span><strong>Din profil</strong><span>{email || 'Personlig workspace'}</span></Menu.Label>
            <Menu.Separator className="profile-menu-separator" />
            {onAccount && <Menu.Item className="profile-menu-item" onSelect={onAccount}><UserRound size={17} />Mitt konto</Menu.Item>}
            <Menu.Item className="profile-menu-item" onSelect={onTheme}>{dark ? <Sun size={17} /> : <Moon size={17} />}{dark ? 'Ljust tema' : 'Mörkt tema'}</Menu.Item>
            {onLogout && <><Menu.Separator className="profile-menu-separator" /><Menu.Item className="profile-menu-item" onSelect={onLogout}><LogOut size={17} />Logga ut</Menu.Item></>}
          </Menu.Content>
        </Menu.Portal>
      </Menu.Root>
      <Button shape="icon" aria-label="Byt färgtema" onClick={onTheme}>{dark ? <Sun size={16} /> : <Moon size={16} />}</Button>
    </div>
  </div>;
}
