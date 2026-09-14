import re

code = """
import React, { useState, useEffect } from 'react';
import { Project, Cluster, KVZ, CustomerItem, AppSettings } from './types';
import { DrilldownDashboard } from './components/DrilldownDashboard';
import { CustomerTable } from './components/CustomerTable';
import { ProtocolPreviewModal } from './components/ProtocolPreviewModal';
import { SettingsModal } from './components/SettingsModal';
import { SetupWizard } from './components/SetupWizard';
// (Mocked default settings)
const DEFAULT_SETTINGS: AppSettings = {
  companyName: 'Firma Muster GmbH',
  companyDept: 'Glasfaserausbau',
  companyContact: 'Max Mustermann',
  defaultTechnician: 'M. Mustermann',
  providerName: 'Provider GmbH',
  projectCluster: 'Projektgebiet Nord',
  launchFiber: '1000 m Vorlauf',
  receiveFiber: '500 m Nachlauf',
  normTitle: 'DIN EN 50346:2010-04 / DIN EN 60793-1-40',
  maxLossSplice: 0.15,
  maxLossConnector: 0.50,
  minOrl: 45.0,
  otdrDeviceModel: '',
  accentColor: '#3b82f6',
  themeMode: 'dark',
};

export function App() {
  const [view, setView] = useState<'drilldown' | 'customers'>('drilldown');
  const [activeKvz, setActiveKvz] = useState<KVZ | null>(null);

  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'matched' | 'pending' | 'exported'>('all');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerItem | null>(null);
  
  const [showSettings, setShowSettings] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    if (window.api?.getAppSettings) {
      window.api.getAppSettings().then(s => {
        if (s) setSettings({ ...DEFAULT_SETTINGS, ...s });
      });
    }
    window.api?.isFirstRun?.().then((isFirst) => {
      if (isFirst) setShowWizard(true);
    });
  }, []);

  const loadCustomers = async (kvzId: string) => {
    if (window.api?.getCustomers) {
      const list = await window.api.getCustomers(kvzId);
      setCustomers(list);
    }
  };

  const handleKvzSelect = (kvz: KVZ) => {
    setActiveKvz(kvz);
    loadCustomers(kvz.id);
    setView('customers');
  };

  const handleBack = () => {
    setView('drilldown');
    setActiveKvz(null);
  };

  const handleGenerateSinglePdf = async (customer: CustomerItem) => {
    if (!window.api?.generatePdfProtocol) return;
    await window.api.generatePdfProtocol(customer, settings, true);
    if (activeKvz) loadCustomers(activeKvz.id);
  };

  const handleSaveCustomerOverride = async (updated: CustomerItem) => {
    if (!window.api?.updateCustomer || !activeKvz) return;
    await window.api.updateCustomer(activeKvz.id, updated);
    loadCustomers(activeKvz.id);
    setSelectedCustomer(null);
  };

  const filteredCustomers = customers.filter(c => {
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        c.customerName.toLowerCase().includes(q) ||
        c.street.toLowerCase().includes(q) ||
        c.id.toString().includes(q)
      );
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'var(--color-bg-base)' }}>
      {/* NAVBAR */}
      <nav style={{ padding: '1rem', backgroundColor: 'var(--color-bg-surface)', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold' }}>OTDR Batch Studio</span>
          {view === 'customers' && (
            <button onClick={handleBack}>← Zurück zu KVZs</button>
          )}
        </div>
        <div>
          <button onClick={() => setShowSettings(true)}>Einstellungen</button>
        </div>
      </nav>

      <main style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {view === 'drilldown' ? (
          <DrilldownDashboard onSelectKvz={handleKvzSelect} settings={settings} />
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '1rem' }}>
            <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
              <input type="text" placeholder="Suche..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}>
                <option value="all">Alle</option>
                <option value="pending">Offen</option>
                <option value="matched">Bereit</option>
              </select>
            </div>
            <CustomerTable 
              customers={filteredCustomers}
              onSelectCustomer={(c) => setSelectedCustomer(c)}
              onGeneratePdf={handleGenerateSinglePdf}
            />
          </div>
        )}
      </main>

      {selectedCustomer && (
        <ProtocolPreviewModal 
          customer={selectedCustomer}
          settings={settings}
          onClose={() => setSelectedCustomer(null)}
          onSaveOverride={handleSaveCustomerOverride}
          onGeneratePdf={handleGenerateSinglePdf}
        />
      )}
      {showSettings && (
        <SettingsModal settings={settings} onClose={() => setShowSettings(false)} onSave={(s) => {
          setSettings(s);
          window.api?.saveAppSettings(s);
          setShowSettings(false);
        }} />
      )}
      {showWizard && <SetupWizard initialSettings={settings} onFinish={(s) => {
        setSettings(s);
        window.api?.saveAppSettings(s);
        setShowWizard(false);
      }} />}
    </div>
  );
}
"""
with open('src/App.tsx', 'w') as f:
    f.write(code)
