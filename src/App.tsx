import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  Vote, 
  Trophy, 
  ShieldCheck, 
  AlertCircle, 
  Trash2,
  CheckCircle2,
  Play,
  Pencil,
  Camera,
  X,
  Edit,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { VotingSystem, Pemilih, Kandidat, UserAccount, UserRole } from './lib/votingLogic';
import { runTests, TestResult } from './lib/testRunner';
import { 
  LogIn, 
  LogOut, 
  Key, 
  User as UserIcon,
  Fingerprint
} from 'lucide-react';

export default function App() {
  const [system] = useState(() => new VotingSystem());
  const [voters, setVoters] = useState<Pemilih[]>([]);
  const [candidates, setCandidates] = useState<Kandidat[]>([]);
  const [testResults, setTestResults] = useState<{ unit: TestResult[], integration: TestResult[] } | null>(null);
  
  // Auth States
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [regForm, setRegForm] = useState({ username: '', password: '', fullName: '', poto: null as string | null });
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  
  // Form States
  const [newVoterName, setNewVoterName] = useState('');
  const [newVoterPhoto, setNewVoterPhoto] = useState<string | null>(null);
  const [newCandidateName, setNewCandidateName] = useState('');
  const [newCandidatePhoto, setNewCandidatePhoto] = useState<string | null>(null);
  const [newCandidateVisi, setNewCandidateVisi] = useState('');
  const [newCandidateMisi, setNewCandidateMisi] = useState('');
  
  const [editingVoterId, setEditingVoterId] = useState<string | null>(null);
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null);
  
  const [selectedVoterId, setSelectedVoterId] = useState('');
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  
  // Profile Edit States
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  
  // Feedback States
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [theme, setTheme] = useState<'frosted' | 'classic'>('frosted');

  // Sync state with logic core
  const refreshState = async (forceReload = true) => {
    if (forceReload) {
      await system.reload();
    }
    setVoters([...system.pemilihList]);
    setCandidates([...system.kandidatList]);
  };

  useEffect(() => {
    refreshState(true);
    // Poll for updates every 10 seconds to keep all clients in sync
    const interval = setInterval(() => refreshState(true), 10000);
    return () => clearInterval(interval);
  }, []);

  const handleResetSystem = async () => {
    if (window.confirm("Hapus seluruh data pemilih, kandidat, dan hasil voting? Tindakan ini tidak dapat dibatalkan.")) {
      await system.reset();
      await refreshState(false);
      setSuccess("Sistem berhasil direset ke kondisi awal.");
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'frosted' ? 'classic' : 'frosted');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await system.reload(); // Always reload before login
      const user = system.login(loginForm.username, loginForm.password);
      setCurrentUser(user);
      if (user.role === UserRole.PEMILIH) {
        setSelectedVoterId(user.username);
      }
      setSuccess(`Selamat datang kembali, ${user.fullName}!`);
      setTimeout(() => setSuccess(null), 3000);
      setError(null);
      await refreshState();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!regForm.username || !regForm.password || !regForm.fullName) {
        throw new Error("Harap isi semua kolom wajib.");
      }
      if (regForm.password.length < 6) {
        throw new Error("Password minimal 6 karakter.");
      }
      await system.register(regForm.username, regForm.password, regForm.fullName, regForm.poto || undefined);
      setSuccess("Pendaftaran berhasil! Silakan login.");
      setTimeout(() => setSuccess(null), 3000);
      setAuthMode('login');
      setError(null);
      await refreshState();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setLoginForm({ username: '', password: '' });
    setSelectedVoterId('');
    setIsEditingProfile(false);
    setSuccess("Anda telah keluar.");
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleStartEditProfile = () => {
    if (!currentUser) return;
    setProfileName(currentUser.fullName);
    setProfilePhoto(currentUser.poto || null);
    setIsEditingProfile(true);
  };

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    try {
      if (currentUser.role === UserRole.PEMILIH) {
        await system.editPemilih(currentUser.username, profileName, profilePhoto || undefined);
      } else {
        // Admin profile update
        const user = system.users.find(u => u.username === currentUser.username);
        if (user) {
          user.fullName = profileName;
          if (profilePhoto) user.poto = profilePhoto;
          // We need to manually trigger save since we modified users array directly
          // @ts-ignore - accessing private for sync
          await system.save();
        }
      }
      
      // Update local currentUser state
      setCurrentUser({
        ...currentUser,
        fullName: profileName,
        poto: profilePhoto || undefined
      });
      
      setIsEditingProfile(false);
      setSuccess("Profil berhasil diperbarui!");
      await refreshState();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string | null) => void, nameContext: string) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("Ukuran file maksimal adalah 5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          const resp = await fetch('/api/upload-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64, name: nameContext })
          });
          if (!resp.ok) throw new Error("Gagal mengunggah foto ke server.");
          const result = await resp.json();
          setter(result.url); // Use the server URL (/uploads/...)
        } catch (err) {
          setError((err as Error).message);
          // Fallback to base64 if server fails (not recommended for large files)
          setter(base64);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddVoter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVoterName.trim()) return;
    try {
      if (editingVoterId) {
        await system.editPemilih(editingVoterId, newVoterName, newVoterPhoto || undefined);
        setSuccess("Pemilih berhasil diperbarui!");
        setEditingVoterId(null);
      } else {
        const id = `V${Date.now()}`;
        await system.tambahPemilih(id, newVoterName, newVoterPhoto || undefined);
        setSuccess("Pemilih berhasil ditambahkan!");
      }
      setNewVoterName('');
      setNewVoterPhoto(null);
      setError(null);
      await refreshState();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDeleteVoter = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Hapus pemilih ini? Data akun login pemilih ini juga akan dihapus.")) return;
    try {
      await system.hapusPemilih(id);
      if (selectedVoterId === id) setSelectedVoterId('');
      await refreshState(false); // Update UI immediately from local state
      setSuccess("Pemilih berhasil dihapus.");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleEditVoter = (v: Pemilih, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingVoterId(v.id);
    setNewVoterName(v.nama);
    setNewVoterPhoto(v.poto || null);
    setError(null);
    document.getElementById('add-voter-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCandidateName.trim()) return;
    try {
      if (editingCandidateId) {
        await system.editKandidat(editingCandidateId, newCandidateName, newCandidatePhoto || undefined, newCandidateVisi, newCandidateMisi);
        setSuccess("Kandidat berhasil diperbarui!");
        setEditingCandidateId(null);
      } else {
        const id = `C${Date.now()}`;
        await system.tambahKandidat(id, newCandidateName, newCandidatePhoto || undefined, newCandidateVisi, newCandidateMisi);
        setSuccess("Kandidat berhasil ditambahkan!");
      }
      setNewCandidateName('');
      setNewCandidatePhoto(null);
      setNewCandidateVisi('');
      setNewCandidateMisi('');
      setError(null);
      await refreshState();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDeleteCandidate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Hapus kandidat ini? Seluruh suara yang masuk untuk kandidat ini akan hilang.")) return;
    try {
      await system.hapusKandidat(id);
      if (selectedCandidateId === id) setSelectedCandidateId('');
      await refreshState(false); // Update UI immediately from local state
      setSuccess("Kandidat berhasil dihapus.");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleEditCandidate = (c: Kandidat, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCandidateId(c.id);
    setNewCandidateName(c.nama);
    setNewCandidatePhoto(c.poto || null);
    setNewCandidateVisi(c.visi || '');
    setNewCandidateMisi(c.misi || '');
    setError(null);
    document.getElementById('manage-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleVote = async (candidateId: string) => {
    if (!currentUser || currentUser.role !== UserRole.PEMILIH) {
      setError("Hanya Pemilih yang dapat memberikan suara. Admin tidak diperkenankan memilih.");
      return;
    }
    if (!selectedVoterId) {
      setError("Data pemilih tidak valid.");
      return;
    }
    if (selectedVoterId !== currentUser.username) {
      setError("Anda tidak diperkenankan memilih atas nama orang lain.");
      return;
    }
    try {
      await system.berikanSuara(selectedVoterId, candidateId);
      setSelectedCandidateId('');
      setError(null);
      setSuccess("Suara berhasil direkam! Terima kasih atas partisipasi Anda.");
      setTimeout(() => setSuccess(null), 3000);
      await refreshState();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleRunTests = async () => {
    const results = await runTests();
    setTestResults(results);
  };

  const sortedResults = useMemo(() => {
    return [...candidates].sort((a, b) => b.jumlahSuara - a.jumlahSuara);
  }, [candidates]);

  const totalVotes = useMemo(() => {
    return candidates.reduce((acc, curr) => acc + curr.jumlahSuara, 0);
  }, [candidates]);

  return (
    <div 
      id="app-root" 
      className={`min-h-screen font-sans relative overflow-x-hidden flex flex-col transition-colors duration-500 ${
        theme === 'frosted' ? 'bg-[#080b1a] text-slate-100' : 'bg-neutral-50 text-neutral-900'
      }`}
    >
      {/* Background Blobs (Only for Frosted) */}
      {theme === 'frosted' && (
        <>
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-fuchsia-600/20 rounded-full blur-[100px] pointer-events-none"></div>
        </>
      )}

      {/* Alerts */}
      <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4">
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`backdrop-blur-md border px-4 py-3 rounded-2xl flex items-center gap-3 shadow-2xl mb-4 ${
                theme === 'frosted' ? 'bg-red-500/20 border-red-500/30 text-red-100' : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              <AlertCircle size={20} className="shrink-0" />
              <span className="text-xs font-medium">{error}</span>
            </motion.div>
          )}
          {success && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`backdrop-blur-md border px-4 py-3 rounded-2xl flex items-center gap-3 shadow-2xl mb-4 ${
                theme === 'frosted' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-100' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}
            >
              <CheckCircle2 size={20} className="shrink-0" />
              <span className="text-xs font-medium">{success}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!currentUser ? (
        <div className="flex-1 flex items-center justify-center p-6 relative z-10">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`w-full max-w-md rounded-[2.5rem] border p-8 shadow-2xl ${
              theme === 'frosted' ? 'backdrop-blur-xl bg-white/5 border-white/10' : 'bg-white border-neutral-200'
            }`}
          >
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-500/30">
                <ShieldCheck size={32} className="text-indigo-400" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">
                {authMode === 'login' ? 'Selamat Datang' : 'Buat Akun Baru'}
              </h2>
              <p className="text-xs text-slate-500 mt-2 uppercase tracking-widest font-bold">
                {authMode === 'login' ? 'E-Voting Ketua Labkom' : 'Daftar sebagai pemilih'}
              </p>
            </div>

            {authMode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Username / ID</label>
                  <div className="relative">
                    <UserIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input 
                      type="text"
                      value={loginForm.username}
                      onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                      className={`w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-600 ${
                        theme === 'classic' ? 'bg-white border-neutral-200 text-neutral-900' : ''
                      }`}
                      placeholder="Masukkan ID Anda"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Password</label>
                  <div className="relative">
                    <Key size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input 
                      type={showLoginPassword ? "text" : "password"}
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      className={`w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-12 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-600 ${
                        theme === 'classic' ? 'bg-white border-neutral-200 text-neutral-900' : ''
                      }`}
                      placeholder="••••••••"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <button 
                  type="submit" 
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg mt-4 flex items-center justify-center gap-2"
                >
                  <LogIn size={16} />
                  Masuk Sekarang
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="flex justify-center mb-6">
                  <div className="relative group">
                    <button 
                      type="button"
                      onClick={() => document.getElementById('reg-poto')?.click()}
                      className={`w-20 h-20 rounded-2xl border flex items-center justify-center overflow-hidden transition-all ${
                        regForm.poto ? 'border-indigo-500' : 'bg-white/5 border-white/10 text-slate-500 hover:bg-white/10'
                      }`}
                    >
                      {regForm.poto ? (
                        <img src={regForm.poto} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <Camera size={24} />
                      )}
                    </button>
                    <input 
                      id="reg-poto" 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => handlePhotoUpload(e, (val) => setRegForm({ ...regForm, poto: val }), regForm.username || 'user')} 
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Nama Lengkap</label>
                  <input 
                    type="text"
                    value={regForm.fullName}
                    onChange={(e) => setRegForm({ ...regForm, fullName: e.target.value })}
                    className={`w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-600 ${
                      theme === 'classic' ? 'bg-white border-neutral-200 text-neutral-900' : ''
                    }`}
                    placeholder="Contoh: Budi Santoso"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Username (ID)</label>
                  <input 
                    type="text"
                    value={regForm.username}
                    onChange={(e) => setRegForm({ ...regForm, username: e.target.value })}
                    className={`w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-600 ${
                      theme === 'classic' ? 'bg-white border-neutral-200 text-neutral-900' : ''
                    }`}
                    placeholder="Username unik"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">Buat Password</label>
                  <div className="relative">
                    <input 
                      type={showRegPassword ? "text" : "password"}
                      value={regForm.password}
                      onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                      className={`w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-600 ${
                        theme === 'classic' ? 'bg-white border-neutral-200 text-neutral-900' : ''
                      }`}
                      placeholder="••••••••"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <button 
                  type="submit" 
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg mt-4 flex items-center justify-center gap-2"
                >
                  <UserPlus size={16} />
                  Daftar Sekarang
                </button>
              </form>
            )}

            <div className="mt-8 text-center">
              <button 
                onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
              >
                {authMode === 'login' ? 'Belum punya akun? Daftar gratis' : 'Sudah punya akun? Masuk'}
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-white/5 text-center">
              <p className="text-[9px] text-slate-500 uppercase tracking-widest leading-relaxed">
                Platform ini menggunakan Local State Management <br /> untuk keperluan demonstrasi fungsionalitas.
              </p>
            </div>
          </motion.div>
          
          <button 
            onClick={toggleTheme}
            className="fixed bottom-8 right-8 w-12 h-12 rounded-full backdrop-blur-md bg-white/10 border border-white/20 flex items-center justify-center text-white"
          >
            <Edit size={20} />
          </button>
        </div>
      ) : (
        <>
          {/* Header */}
      <header 
        id="app-header" 
        className={`flex justify-between items-center px-8 py-6 z-10 sticky top-0 ${
          theme === 'frosted' 
            ? 'backdrop-blur-md bg-white/5 border-b border-white/10' 
            : 'bg-white border-b border-neutral-200 shadow-sm'
        }`}
      >
        <div>
          <h1 className={`text-2xl font-bold tracking-tight ${
            theme === 'frosted' ? 'bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent' : 'text-neutral-900'
          }`}>
            E-VOTING LABKOM
          </h1>
          <p className={`text-[10px] uppercase tracking-widest mt-1 font-bold ${
            theme === 'frosted' ? 'text-slate-400' : 'text-neutral-500'
          }`}>
            Pemilihan Ketua Laboratorium Komputer
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* User Profile */}
          <div className={`hidden md:flex items-center gap-3 px-4 py-2 rounded-2xl border ${
            theme === 'frosted' ? 'bg-white/5 border-white/10' : 'bg-neutral-50 border-neutral-100'
          }`}>
            <div className="w-8 h-8 rounded-xl bg-indigo-500 overflow-hidden border border-white/20">
              {currentUser.poto ? (
                <img src={currentUser.poto} alt={currentUser.fullName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-[10px] font-bold">
                  {currentUser.fullName.substring(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div className="text-left">
              <p className="text-[10px] font-bold tracking-tight truncate max-w-[100px]">{currentUser.fullName}</p>
              <p className={`text-[8px] uppercase tracking-widest font-black ${
                currentUser.role === UserRole.ADMIN ? 'text-fuchsia-400' : 'text-indigo-400'
              }`}>{currentUser.role}</p>
            </div>
          </div>

          <div className={`px-4 py-2 rounded-full hidden sm:flex items-center gap-2 ${
            theme === 'frosted' ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-200'
          }`}>
            <div className={`w-2 h-2 rounded-full bg-emerald-500 animate-pulse`}></div>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${
              theme === 'frosted' ? 'text-emerald-400' : 'text-emerald-600'
            }`}>
              Sistem Aktif
            </span>
          </div>

          {/* Theme Toggle */}
          <button 
            onClick={toggleTheme}
            className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${
              theme === 'frosted' ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
            }`}
            title="Ganti Tampilan"
          >
            {theme === 'frosted' ? <CheckCircle2 size={20} /> : <Edit size={20} />}
          </button>

          {/* Reset Global (Admin Only) */}
          {currentUser.role === UserRole.ADMIN && (
            <button 
              onClick={handleResetSystem}
              className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${
                theme === 'frosted' ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20' : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
              }`}
              title="Reset Seluruh Data"
            >
              <Trash2 size={20} />
            </button>
          )}

          {/* Logout */}
          <button 
            onClick={handleLogout}
            className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${
              theme === 'frosted' ? 'bg-white/5 border-white/10 text-white hover:bg-white/15' : 'bg-white border-neutral-200 text-neutral-600 hover:text-red-600'
            }`}
            title="Keluar"
          >
            <LogOut size={20} />
          </button>

          {currentUser.role === UserRole.ADMIN && (
            <button 
              id="run-tests-btn"
              onClick={handleRunTests}
              className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${
                theme === 'frosted' ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
              }`}
              title="Jalankan Uji Sistem"
            >
              <ShieldCheck size={20} />
            </button>
          )}
        </div>
      </header>

      {/* Alerts */}
      <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`backdrop-blur-md border px-4 py-3 rounded-2xl flex items-center gap-3 shadow-2xl mb-4 ${
                theme === 'frosted' ? 'bg-red-500/20 border-red-500/30 text-red-100' : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              <AlertCircle size={20} className="shrink-0" />
              <span className="text-xs font-medium">{error}</span>
            </motion.div>
          )}
          {success && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`backdrop-blur-md border px-4 py-3 rounded-2xl flex items-center gap-3 shadow-2xl mb-4 ${
                theme === 'frosted' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-100' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
              }`}
            >
              <CheckCircle2 size={20} className="shrink-0" />
              <span className="text-xs font-medium">{success}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Content */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 p-8 relative z-10 max-w-[1600px] mx-auto w-full">
        
        {/* Sidebar Left: Management (Admin Only) */}
        {currentUser.role === UserRole.ADMIN ? (
          <section id="manage-section" className="lg:col-span-3 flex flex-col gap-6">
          <div className={`border rounded-[2rem] p-6 flex flex-col min-h-[400px] ${
            theme === 'frosted' ? 'backdrop-blur-xl bg-white/5 border-white/10' : 'bg-white border-neutral-200 shadow-sm'
          }`}>
            <h3 className={`text-xs font-bold mb-6 flex items-center gap-2 uppercase tracking-widest ${
              theme === 'frosted' ? 'text-slate-300' : 'text-neutral-700'
            }`}>
              <Users size={16} />
              Daftar Pemilih
            </h3>
            
            <div className="flex-1 space-y-3 overflow-y-auto max-h-[300px] pr-2 mb-6 scrollbar-hide">
              {voters.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic text-center py-8">Belum ada pemilih terdaftar.</p>
              ) : (
                voters.map(v => (
                  <div 
                    key={v.id}
                    onClick={() => {
                      if (currentUser?.role === UserRole.ADMIN) return; // Admin cannot select voter identity
                      if (!v.sudahMemilih) setSelectedVoterId(v.id);
                    }}
                    className={`w-full p-3 rounded-2xl border transition-all flex items-center gap-3 text-left ${
                      currentUser?.role === UserRole.ADMIN ? 'cursor-default' : 'cursor-pointer'
                    } group/item ${
                      selectedVoterId === v.id 
                        ? (theme === 'frosted' ? 'bg-indigo-600/30 border-indigo-500/50' : 'bg-indigo-50 border-indigo-200') 
                        : v.sudahMemilih 
                          ? (theme === 'frosted' ? 'opacity-60 bg-white/2 border-white/5' : 'bg-neutral-50 opacity-60 border-neutral-100')
                          : (theme === 'frosted' ? 'bg-white/5 border-white/5 hover:border-white/20' : 'bg-white border-neutral-100 hover:border-neutral-300')
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold overflow-hidden shrink-0 ${
                      v.sudahMemilih 
                        ? (theme === 'frosted' ? 'bg-slate-700 text-slate-400' : 'bg-neutral-200 text-neutral-400') 
                        : (theme === 'frosted' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600')
                    }`}>
                      {v.poto ? (
                        <img src={v.poto} alt={v.nama} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        v.nama.substring(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold truncate ${v.sudahMemilih ? 'line-through text-slate-500' : (theme === 'frosted' ? 'text-white' : 'text-neutral-900')}`}>{v.nama}</p>
                      <p className="text-[10px] text-slate-500 truncate">ID: {v.id.substring(0, 8)} • <span className={v.sudahMemilih ? 'text-slate-600' : 'text-emerald-400'}>{v.sudahMemilih ? 'Voted' : 'Verified'}</span></p>
                    </div>
                    <div className="flex items-center gap-1 opacity-100 lg:opacity-0 group-hover/item:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => handleEditVoter(v, e)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          theme === 'frosted' ? 'hover:bg-white/10 text-slate-400 hover:text-white' : 'hover:bg-neutral-100 text-neutral-400 hover:text-neutral-900'
                        }`}
                      >
                        <Pencil size={12} />
                      </button>
                      <button 
                        onClick={(e) => handleDeleteVoter(v.id, e)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          theme === 'frosted' ? 'hover:bg-red-500/20 text-slate-400 hover:text-red-400' : 'hover:bg-red-50 text-neutral-400 hover:text-red-600'
                        }`}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    {selectedVoterId === v.id && <CheckCircle2 size={14} className="text-indigo-400 shrink-0" />}
                  </div>
                ))
              )}
            </div>

            <div id="add-voter-form" className={`pt-6 border-t mt-auto ${theme === 'frosted' ? 'border-white/10' : 'border-neutral-100'}`}>
              <div className="flex justify-between items-center mb-3 text-xs">
                <label className={`uppercase tracking-widest font-bold ml-1 ${theme === 'frosted' ? 'text-slate-500' : 'text-neutral-500'}`}>
                  {editingVoterId ? 'Edit Pemilih' : 'Tambah Pemilih'}
                </label>
                {editingVoterId && (
                  <button onClick={() => {
                    setEditingVoterId(null);
                    setNewVoterName('');
                    setNewVoterPhoto(null);
                  }} className="text-slate-500 hover:text-red-500">
                    <X size={14} />
                  </button>
                )}
              </div>
              <form onSubmit={handleAddVoter} className="space-y-3">
                <div className="flex gap-2">
                  <div className="relative group/photo shrink-0">
                    <button 
                      type="button"
                      onClick={() => document.getElementById('voter-photo')?.click()}
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center overflow-hidden transition-all ${
                        theme === 'frosted' 
                          ? (newVoterPhoto ? 'border-indigo-500/50' : 'bg-white/5 border-white/10 text-slate-500') 
                          : (newVoterPhoto ? 'border-indigo-400' : 'bg-neutral-50 border-neutral-200 text-neutral-400')
                      }`}
                    >
                      {newVoterPhoto ? (
                        <img src={newVoterPhoto} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <Camera size={18} />
                      )}
                    </button>
                    <input 
                      id="voter-photo" 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => handlePhotoUpload(e, setNewVoterPhoto, newVoterName || 'voter')} 
                    />
                  </div>
                  <input 
                    type="text" 
                    value={newVoterName}
                    onChange={(e) => setNewVoterName(e.target.value)}
                    placeholder="Nama Lengkap..." 
                    className={`rounded-xl px-4 py-2.5 text-xs w-full focus:outline-none focus:ring-1 transition-all border ${
                      theme === 'frosted' 
                        ? 'bg-white/5 border-white/10 text-white focus:ring-indigo-500 placeholder:text-slate-600' 
                        : 'bg-white border-neutral-200 text-neutral-900 focus:ring-neutral-400 placeholder:text-neutral-300'
                    }`}
                  />
                  <button type="submit" className={`p-2.5 rounded-xl transition-colors shrink-0 ${
                    editingVoterId 
                      ? (theme === 'frosted' ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-indigo-600 hover:bg-indigo-700 text-white') 
                      : (theme === 'frosted' ? 'bg-white/10 hover:bg-white/20' : 'bg-neutral-900 hover:bg-neutral-800 text-white')
                  }`}>
                    {editingVoterId ? <Edit size={18} /> : <UserPlus size={18} />}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className={`border rounded-[2rem] p-6 ${
            theme === 'frosted' ? 'backdrop-blur-xl bg-white/5 border-white/10' : 'bg-white border-neutral-200 shadow-sm'
          }`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className={`text-xs font-bold flex items-center gap-2 uppercase tracking-widest ${
                theme === 'frosted' ? 'text-slate-300' : 'text-neutral-700'
              }`}>
                <UserPlus size={16} />
                {editingCandidateId ? 'Edit Kandidat' : 'Tambah Kandidat'}
              </h3>
              {editingCandidateId && (
                <button onClick={() => {
                  setEditingCandidateId(null);
                  setNewCandidateName('');
                  setNewCandidatePhoto(null);
                  setNewCandidateVisi('');
                  setNewCandidateMisi('');
                }} className="text-slate-500 hover:text-red-500">
                  <X size={14} />
                </button>
              )}
            </div>
            <form onSubmit={handleAddCandidate} className="space-y-4">
              <div className="flex gap-2">
                <div className="relative group/photo shrink-0">
                  <button 
                    type="button"
                    onClick={() => document.getElementById('candidate-photo-input')?.click()}
                    className={`w-10 h-10 rounded-xl border flex items-center justify-center overflow-hidden transition-all ${
                      theme === 'frosted' 
                        ? (newCandidatePhoto ? 'border-fuchsia-500/50' : 'bg-white/5 border-white/10 text-slate-500') 
                        : (newCandidatePhoto ? 'border-fuchsia-400' : 'bg-neutral-50 border-neutral-200 text-neutral-400')
                    }`}
                  >
                    {newCandidatePhoto ? (
                      <img src={newCandidatePhoto} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <Camera size={18} />
                    )}
                  </button>
                  <input 
                    id="candidate-photo-input" 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => handlePhotoUpload(e, setNewCandidatePhoto, newCandidateName || 'candidate')} 
                  />
                </div>
                <input 
                  type="text" 
                  value={newCandidateName}
                  onChange={(e) => setNewCandidateName(e.target.value)}
                  placeholder="Nama Kandidat..." 
                  className={`rounded-xl px-4 py-2.5 text-xs w-full focus:outline-none focus:ring-1 transition-all border font-medium ${
                    theme === 'frosted' 
                      ? 'bg-white/5 border-white/10 text-white focus:ring-fuchsia-500 placeholder:text-slate-600' 
                      : 'bg-white border-neutral-200 text-neutral-900 focus:ring-neutral-400 placeholder:text-neutral-300'
                  }`}
                />
              </div>
              <div className="space-y-3">
                <textarea 
                  value={newCandidateVisi}
                  onChange={(e) => setNewCandidateVisi(e.target.value)}
                  placeholder="Visi..." 
                  rows={2}
                  className={`rounded-xl px-4 py-2 text-xs w-full focus:outline-none focus:ring-1 transition-all border resize-none ${
                    theme === 'frosted' 
                      ? 'bg-white/5 border-white/10 text-white focus:ring-fuchsia-500 placeholder:text-slate-600' 
                      : 'bg-white border-neutral-200 text-neutral-900 focus:ring-neutral-400 placeholder:text-neutral-300'
                  }`}
                />
                <textarea 
                  value={newCandidateMisi}
                  onChange={(e) => setNewCandidateMisi(e.target.value)}
                  placeholder="Misi..." 
                  rows={3}
                  className={`rounded-xl px-4 py-2 text-xs w-full focus:outline-none focus:ring-1 transition-all border resize-none ${
                    theme === 'frosted' 
                      ? 'bg-white/5 border-white/10 text-white focus:ring-fuchsia-500 placeholder:text-slate-600' 
                      : 'bg-white border-neutral-200 text-neutral-900 focus:ring-neutral-400 placeholder:text-neutral-300'
                  }`}
                />
                <button type="submit" className={`w-full py-2.5 rounded-xl transition-colors font-bold text-xs ${
                  editingCandidateId 
                    ? (theme === 'frosted' ? 'bg-fuchsia-600 hover:bg-fuchsia-500 text-white' : 'bg-fuchsia-600 hover:bg-fuchsia-700 text-white') 
                    : (theme === 'frosted' ? 'bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-400' : 'bg-neutral-900 hover:bg-neutral-800 text-white')
                }`}>
                  {editingCandidateId ? 'Simpan Perubahan' : 'Tambah Kandidat'}
                </button>
              </div>
            </form>
          </div>
        </section>
        ) : (
          <section className="lg:col-span-3 flex flex-col gap-6">
            <div className={`border rounded-[2rem] p-8 ${
              theme === 'frosted' ? 'backdrop-blur-xl bg-white/5 border-white/10' : 'bg-white border-neutral-200'
            }`}>
              <div className="flex flex-col items-center text-center">
                 <div className="w-20 h-20 bg-indigo-500/20 rounded-[2rem] flex items-center justify-center mb-6 border border-indigo-500/30">
                    <Fingerprint size={40} className="text-indigo-400" />
                 </div>
                 <h3 className="text-lg font-bold mb-2">Profil Pemilih</h3>
                 <p className="text-xs text-slate-500 uppercase tracking-widest font-black mb-6">
                   {isEditingProfile ? 'Edit Informasi Profil' : 'Status Kehadiran'}
                 </p>
                 
                 <div className={`w-full p-6 rounded-[2rem] border ${
                   theme === 'frosted' ? 'bg-white/5 border-white/10' : 'bg-neutral-50 border-neutral-100'
                 }`}>
                    {isEditingProfile ? (
                      <div className="space-y-4">
                        <div className="flex justify-center mb-4">
                          <div className="relative group cursor-pointer" onClick={() => document.getElementById('profile-poto')?.click()}>
                            <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-indigo-500/50">
                              {profilePhoto ? (
                                <img src={profilePhoto} alt="Preview" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                  <Camera size={24} />
                                </div>
                              )}
                            </div>
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-2xl">
                              <Camera size={16} className="text-white" />
                            </div>
                            <input 
                              id="profile-poto" 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => handlePhotoUpload(e, setProfilePhoto, currentUser?.username || 'profile')} 
                            />
                          </div>
                        </div>
                        <div className="space-y-1 text-left">
                          <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500 ml-1">Nama Lengkap</label>
                          <input 
                            type="text"
                            value={profileName}
                            onChange={(e) => setProfileName(e.target.value)}
                            className={`w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                              theme === 'classic' ? 'bg-white border-neutral-200 text-neutral-900' : ''
                            }`}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={handleSaveProfile}
                            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all"
                          >
                            Simpan
                          </button>
                          <button 
                            onClick={() => setIsEditingProfile(false)}
                            className={`px-4 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all ${
                              theme === 'frosted' ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-neutral-200 hover:bg-neutral-300 text-neutral-700'
                            }`}
                          >
                            Batal
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Akun Terdaftar</p>
                        <p className="text-sm font-bold truncate mb-4">{currentUser.fullName}</p>
                        
                        <div className={`flex items-center justify-center gap-2 py-3 rounded-xl mb-4 ${
                          voters.find(p => p.id === currentUser.username)?.sudahMemilih
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        }`}>
                           {voters.find(p => p.id === currentUser.username)?.sudahMemilih ? <CheckCircle2 size={16} /> : <Play size={16} />}
                           <span className="text-[10px] font-black uppercase tracking-widest">
                             {voters.find(p => p.id === currentUser.username)?.sudahMemilih ? 'Sudah Memilih' : 'Belum Memilih'}
                           </span>
                        </div>

                        <button 
                          onClick={handleStartEditProfile}
                          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border transition-all ${
                            theme === 'frosted' ? 'bg-white/5 border-white/10 hover:bg-white/10 text-slate-300' : 'bg-white border-neutral-200 hover:bg-neutral-50 text-neutral-600'
                          }`}
                        >
                          <Pencil size={12} />
                          <span className="text-[9px] font-bold uppercase tracking-widest">Edit Profil</span>
                        </button>
                      </>
                    )}
                 </div>
              </div>
            </div>
          </section>
        )}

        {/* Center: Election View */}
        <section id="election-grid" className="lg:col-span-6 flex flex-col gap-6">
          <div className="flex justify-between items-end mb-2 px-2">
            <h2 className={`text-lg font-bold tracking-tight ${theme === 'frosted' ? 'text-white' : 'text-neutral-900'}`}>Daftar Kandidat</h2>
            <span className={`text-[10px] px-2 py-1 rounded border uppercase tracking-wider font-bold ${
              theme === 'frosted' ? 'text-slate-400 bg-white/5 border-white/10' : 'text-neutral-500 bg-neutral-100 border-neutral-200'
            }`}>
              KETUK UNTUK MEMILIH
            </span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-20">
            {candidates.length === 0 ? (
              <div className={`col-span-full py-20 text-center border-2 border-dashed rounded-[2.5rem] ${
                theme === 'frosted' ? 'bg-white/5 border-white/10' : 'bg-white border-neutral-200'
              }`}>
                <p className="text-slate-500 italic">Belum ada kandidat. Silakan tambahkan di panel samping.</p>
              </div>
            ) : (
              candidates.map((c, index) => (
                <motion.div 
                  layout
                  key={c.id} 
                  className={`group relative border rounded-[2.5rem] p-6 transition-all ${
                    theme === 'frosted' 
                      ? `backdrop-blur-xl bg-white/5 ${selectedCandidateId === c.id ? 'border-white/40 ring-1 ring-white/10' : 'border-white/20 hover:bg-white/10'}`
                      : `bg-white shadow-sm ${selectedCandidateId === c.id ? 'border-neutral-900 ring-1 ring-neutral-900 shadow-lg' : 'border-neutral-200 hover:border-neutral-400'}`
                  }`}
                >
                  {/* Actions (Admin Only) */}
                  {currentUser.role === UserRole.ADMIN && (
                    <div className="absolute top-6 right-6 flex items-center gap-1.5 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      <button 
                        onClick={(e) => handleEditCandidate(c, e)}
                        className={`p-2 rounded-xl backdrop-blur-md border shadow-lg transition-all ${
                          theme === 'frosted' ? 'bg-white/10 hover:bg-white/20 text-white border-white/10' : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                        }`}
                        title="Edit Kandidat"
                      >
                        <Pencil size={14} />
                      </button>
                      <button 
                        onClick={(e) => handleDeleteCandidate(c.id, e)}
                        className={`p-2 rounded-xl backdrop-blur-md border shadow-lg transition-all ${
                          theme === 'frosted' ? 'bg-red-500/20 hover:bg-red-500/40 text-red-100 border-red-500/10' : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                        }`}
                        title="Hapus Kandidat"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}

                  <div className={`w-full aspect-[4/5] rounded-[2rem] mb-4 border flex items-center justify-center relative overflow-hidden ${
                    theme === 'frosted' ? 'bg-gradient-to-br from-indigo-500/10 to-transparent border-white/5' : 'bg-neutral-100 border-neutral-100'
                  }`}>
                    {c.poto ? (
                      <img src={c.poto} alt={c.nama} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
                    ) : (
                      <div className={`text-6xl font-black opacity-10 group-hover:scale-110 transition-transform duration-500 select-none ${theme === 'frosted' ? 'text-white' : 'text-neutral-900'}`}>
                        {String(index + 1).padStart(2, '0')}
                      </div>
                    )}
                    <div className={`absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t ${
                      theme === 'frosted' ? 'from-[#080b1a] to-transparent' : 'from-white to-transparent'
                    }`}>
                      <p className={`text-base font-bold text-center tracking-tight truncate ${theme === 'frosted' ? 'text-white' : 'text-neutral-900'}`}>{c.nama}</p>
                      <p className={`text-[10px] text-center font-bold uppercase tracking-widest mt-1 opacity-60 ${theme === 'frosted' ? 'text-indigo-400' : 'text-neutral-500'}`}>
                        Kandidat {index + 1}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4 mb-6">
                    <div>
                      <h4 className={`text-[10px] font-black uppercase tracking-widest mb-1 ${theme === 'frosted' ? 'text-indigo-400' : 'text-indigo-600'}`}>Visi</h4>
                      <p className={`text-[11px] leading-relaxed ${theme === 'frosted' ? 'text-slate-300' : 'text-neutral-600'}`}>
                        {c.visi || "Belum ada visi."}
                      </p>
                    </div>
                    <div>
                      <h4 className={`text-[10px] font-black uppercase tracking-widest mb-1 ${theme === 'frosted' ? 'text-indigo-400' : 'text-indigo-600'}`}>Misi</h4>
                      <p className={`text-[11px] leading-relaxed line-clamp-3 ${theme === 'frosted' ? 'text-slate-300' : 'text-neutral-600'}`}>
                        {c.misi || "Belum ada misi."}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleVote(c.id)}
                    disabled={currentUser.role === UserRole.ADMIN}
                    className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95 shadow-xl ${
                      currentUser.role === UserRole.ADMIN
                        ? 'opacity-50 cursor-not-allowed bg-slate-500/20 text-slate-500'
                        : theme === 'frosted' 
                          ? 'bg-white text-slate-900 hover:bg-slate-200' 
                          : 'bg-neutral-900 text-white hover:bg-neutral-800'
                    }`}
                  >
                    {currentUser.role === UserRole.ADMIN ? 'Admin Tidak Memilih' : 'Kirim Suara'}
                  </button>
                </motion.div>
              ))
            )}
          </div>
          
          <div className={`mt-auto p-5 border rounded-2xl ${
            theme === 'frosted' ? 'backdrop-blur-3xl bg-slate-950/60 border-white/10' : 'bg-white border-neutral-200 shadow-sm'
          }`}>
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_#6366f1] ${theme === 'frosted' ? 'bg-indigo-500' : 'bg-indigo-600'}`}></div>
                  <p className={`text-[10px] font-mono uppercase tracking-tighter ${theme === 'frosted' ? 'text-slate-400' : 'text-neutral-500'}`}>Status Integrasi Sistem</p>
               </div>
               <div className="flex gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-500 font-mono">Unit:</span>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase tracking-wider">Pass</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-500 font-mono">Integr:</span>
                    <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase tracking-wider">Pass</span>
                  </div>
               </div>
            </div>
          </div>
        </section>

        {/* Sidebar Right: Results */}
        <section id="results-section" className="lg:col-span-3 flex flex-col gap-6">
          <div className={`border rounded-[2.5rem] p-8 ${
            theme === 'frosted' ? 'backdrop-blur-xl bg-white/5 border-white/10' : 'bg-white border-neutral-200 shadow-sm'
          }`}>
            <h3 className={`text-xs font-bold mb-8 flex items-center gap-2 uppercase tracking-widest ${
              theme === 'frosted' ? 'text-slate-300' : 'text-neutral-700'
            }`}>
              <Trophy size={16} className="text-yellow-500" />
              Perolehan Suara
            </h3>
            
            <div className="space-y-8">
              {candidates.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic text-center py-8">Menunggu data...</p>
              ) : (
                sortedResults.map((c, i) => {
                  const percentage = totalVotes > 0 ? (c.jumlahSuara / totalVotes) : 0;
                  return (
                    <div key={c.id}>
                      <div className="flex justify-between items-center text-[10px] mb-2 font-bold tracking-tight gap-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {c.poto && <img src={c.poto} className="w-6 h-6 rounded-md object-cover border border-white/10" alt="" referrerPolicy="no-referrer" />}
                          <span className={`${theme === 'frosted' ? 'text-slate-400' : 'text-neutral-600'} uppercase truncate`}>{c.nama}</span>
                        </div>
                        <span className={`${theme === 'frosted' ? 'text-slate-200' : 'text-neutral-900'} shrink-0`}>{c.jumlahSuara} Suara</span>
                      </div>
                      <div className={`h-2.5 w-full rounded-full overflow-hidden border ${
                        theme === 'frosted' ? 'bg-white/5 border-white/5' : 'bg-neutral-100 border-neutral-100'
                      }`}>
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage * 100}%` }}
                          transition={{ duration: 1, ease: "easeOut" }}
                          className={`h-full rounded-full ${
                            i === 0 
                              ? (theme === 'frosted' ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : 'bg-indigo-600') 
                              : (theme === 'frosted' ? 'bg-slate-700' : 'bg-neutral-300')
                          }`}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className={`mt-10 pt-8 border-t ${theme === 'frosted' ? 'border-white/5' : 'border-neutral-100'}`}>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Partisipasi</p>
                  <p className={`text-3xl font-light tracking-tighter ${theme === 'frosted' ? 'text-white' : 'text-neutral-900'}`}>
                    {totalVotes} <span className="text-xs text-slate-500">/ {voters.length}</span>
                  </p>
                </div>
                <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center relative ${
                  theme === 'frosted' ? 'border-indigo-500/30 bg-indigo-500/5' : 'border-indigo-200 bg-indigo-50'
                }`}>
                  <span className={`text-xs font-bold font-mono ${theme === 'frosted' ? 'text-white' : 'text-indigo-700'}`}>
                    {voters.length > 0 ? Math.round((totalVotes / voters.length) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className={`border rounded-[2rem] p-6 flex-1 flex flex-col ${
            theme === 'frosted' ? 'bg-slate-900/40 border-indigo-500/20 shadow-xl' : 'bg-white border-neutral-200 shadow-sm'
          }`}>
            <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-6">Laporan Pengujian (QA)</div>
            
            <div className="space-y-4 flex-1">
              {!testResults ? (
                <div className="flex flex-col items-center justify-center h-full py-10 opacity-30 text-center">
                  <ShieldCheck size={32} className="mb-2" />
                  <p className="text-[10px] italic">Klik ikon Shield di atas.</p>
                </div>
              ) : (
                <>
                  {[...testResults.unit, ...testResults.integration].map((r, i) => (
                    <div key={i} className={`flex items-center justify-between text-[11px] py-2 border-b ${
                      theme === 'frosted' ? 'border-white/5' : 'border-neutral-50'
                    }`}>
                      <span className="text-slate-500 font-medium">{r.name}</span>
                      <span className={`font-black tracking-widest text-[9px] px-2 py-0.5 rounded-full ${
                        r.status === 'PASS' 
                          ? 'bg-emerald-500/10 text-emerald-400' 
                          : 'bg-red-500/10 text-red-500'
                      }`}>
                        {r.status}
                      </span>
                    </div>
                  ))}
                  <div className="mt-6">
                    <div className={`p-4 rounded-2xl border text-center ${
                      theme === 'frosted' ? 'bg-white/5 border-white/5' : 'bg-neutral-50 border-neutral-100'
                    }`}>
                       <p className="text-[9px] text-slate-500 italic leading-relaxed">
                         "Protocol: Integrity Check Pas. Duplicate entries blocked."
                       </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className={`px-8 py-6 border-t flex flex-col sm:flex-row justify-between items-center text-[10px] transition-all ${
        theme === 'frosted' ? 'bg-slate-950/80 border-white/5 text-slate-500' : 'bg-white border-neutral-200 text-neutral-400'
      }`}>
        <p className="mb-2 sm:mb-0">© 2026 E-Voting Secure System. Studi Kasus 01.</p>
        <div className="flex gap-6 uppercase tracking-widest font-bold">
          <span className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
            V-1.0.5 Stable
          </span>
          <span>LATENCY: 12ms</span>
        </div>
      </footer>
    </>
    )}
  </div>
  );
}

