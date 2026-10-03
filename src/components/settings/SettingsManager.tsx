import React, { useState } from 'react';
import { Sliders, Edit2, Check, X, ShieldAlert } from 'lucide-react';
import { DatabaseState, SettingsRecord } from '../../types/database';
import { storageService } from '../../services/storageService';

interface SettingsManagerProps {
  dbState: DatabaseState;
}

export const SettingsManager: React.FC<SettingsManagerProps> = ({ dbState }) => {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const startEdit = (setting: SettingsRecord) => {
    setEditingKey(setting.key);
    setEditValue(setting.value);
  };

  const handleSave = (key: string) => {
    storageService.updateSetting(key, editValue.trim(), 'Admin');
    setEditingKey(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex items-center space-x-2">
          <Sliders className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Pengaturan Sistem Global (Sheet: 01_SETTINGS)
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Parameter default penentu margin profitabilitas, kelayakan iklan, dan metode alokasi team.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Parameter Konfigurasi Aktif</h2>
          <span className="text-xs text-slate-500">Tersimpan di Sheet 01_SETTINGS</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Parameter Key</th>
                <th className="py-3 px-4">Nilai Aktif</th>
                <th className="py-3 px-4">Deskripsi</th>
                <th className="py-3 px-4">Terakhir Diperbarui</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dbState.settings.map((setting) => {
                const isEditing = editingKey === setting.key;
                return (
                  <tr key={setting.key} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{setting.key}</td>
                    <td className="py-3 px-4">
                      {isEditing ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="px-2 py-1 text-xs font-mono font-semibold rounded border border-blue-500 focus:outline-none"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSave(setting.key)}
                            className="p-1 rounded bg-blue-600 text-white hover:bg-blue-700"
                            title="Simpan"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingKey(null)}
                            className="p-1 rounded bg-slate-200 text-slate-700 hover:bg-slate-300"
                            title="Batal"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="px-2.5 py-1 rounded bg-blue-50 text-blue-800 font-mono font-bold border border-blue-200">
                          {setting.value}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{setting.description}</td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {new Date(setting.updated_at).toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {!isEditing && (
                        <button
                          onClick={() => startEdit(setting)}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"
                          title="Ubah Nilai"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
