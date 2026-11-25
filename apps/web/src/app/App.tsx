// Rutas de la SPA (docs/arquitectura.md §5.2) con la guarda RequirePermission.
// En HU-01: /pedidos y /cola (inicios tras el login) y /menu, /personal y
// /resumen vacías, todas con su guarda. Sin sesión → P-01; ruta desconocida →
// inicio del rol. Tras entrar se va al inicio del rol, no a la ruta pedida.
import { useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router';
import type { Permission } from '@mi-app/shared/permissions';
import { ChangePinScreen } from '../features/login/ChangePinScreen.tsx';
import { LoginScreen } from '../features/login/LoginScreen.tsx';
import { clearForbidden, consumeSessionEnd, setIdleExempt, useSession } from '../session/store.ts';
import { AccessDeniedContent, homeFor, Layout } from './Layout.tsx';

interface ScreenRoute {
  path: string;
  title: string;
  permission: Permission;
}

const SCREENS: ScreenRoute[] = [
  { path: '/pedidos', title: 'Pedidos', permission: 'order:read' },
  { path: '/cola', title: 'Cola', permission: 'kitchen:read' },
  { path: '/menu', title: 'Menú', permission: 'menu:manage' },
  { path: '/personal', title: 'Personal', permission: 'staff:read' },
  { path: '/resumen', title: 'Resumen del día', permission: 'reports:read' },
];

function Booting() {
  return (
    <main className="login">
      <p className="pin-help">Cargando…</p>
    </main>
  );
}

/** Contenido de las pantallas de HU-01 hasta que llegue su historia (wireframe 10). */
function EmptyScreen({ kitchenQueue }: { kitchenQueue: boolean }) {
  // La barra con la cola abierta no caduca por inactividad (HU-01/CA-F09).
  useEffect(() => {
    setIdleExempt(kitchenQueue);
    return () => setIdleExempt(false);
  }, [kitchenQueue]);
  return <p className="placeholder">Esta pantalla todavía no está disponible.</p>;
}

/** Guarda de ruta: decide con `permissions` de /auth/me ANTES de montar la pantalla. */
function RequirePermission({ screen }: { screen: ScreenRoute }) {
  const session = useSession();
  const location = useLocation();
  useEffect(() => {
    if (session.forbiddenPath && session.forbiddenPath !== location.pathname) clearForbidden();
  }, [location.pathname, session.forbiddenPath]);
  if (session.status === 'booting') return <Booting />;
  if (session.status !== 'authenticated' || !session.me) return <Navigate to="/" replace={!consumeSessionEnd()} />;
  const me = session.me;
  if (me.user.mustChangePin) {
    return (
      <Layout title="Cambia tu PIN">
        <ChangePinScreen />
      </Layout>
    );
  }
  const allowed = me.permissions.includes(screen.permission) && session.forbiddenPath !== location.pathname;
  if (!allowed) {
    return (
      <Layout title="Acceso denegado">
        <AccessDeniedContent kitchen={me.user.role === 'kitchen'} />
      </Layout>
    );
  }
  return (
    <Layout title={screen.title}>
      <EmptyScreen kitchenQueue={screen.path === '/cola' && me.user.role === 'kitchen'} />
    </Layout>
  );
}

function LoginRoute() {
  const session = useSession();
  if (session.status === 'booting') return <Booting />;
  if (session.status === 'authenticated' && session.me) return <Navigate to={homeFor(session.me.permissions)} replace />;
  return <LoginScreen />;
}

function Fallback() {
  const session = useSession();
  if (session.status === 'booting') return <Booting />;
  if (session.status === 'authenticated' && session.me) return <Navigate to={homeFor(session.me.permissions)} replace />;
  return <Navigate to="/" replace />;
}

export function App() {
  const session = useSession();
  return (
    <>
      <Routes>
        <Route path="/" element={<LoginRoute />} />
        {SCREENS.map((s) => (
          <Route key={s.path} path={s.path} element={<RequirePermission screen={s} />} />
        ))}
        <Route path="*" element={<Fallback />} />
      </Routes>
      {session.toast ? (
        <div className="toast" role="status">
          {session.toast}
        </div>
      ) : null}
    </>
  );
}
