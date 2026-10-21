import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import CatalogPage from './pages/CatalogPage';
import { Spinner } from './components/ui';

// Páginas com Three.js são carregadas sob demanda.
const ProductPage = lazy(() => import('./pages/ProductPage'));
const SimulatorPage = lazy(() => import('./pages/SimulatorPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const CompositionsPage = lazy(() => import('./pages/CompositionsPage'));

const page = (el: ReactNode) => <Suspense fallback={<div className="p-8"><Spinner /></div>}>{el}</Suspense>;

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<CatalogPage />} />
        <Route path="produto/:id" element={page(<ProductPage />)} />
        <Route path="simulador" element={page(<SimulatorPage />)} />
        <Route path="composicoes" element={page(<CompositionsPage />)} />
        <Route path="admin" element={page(<AdminPage />)} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
