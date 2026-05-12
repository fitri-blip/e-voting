/**
 * Representasi Pengguna (Admin atau Pemilih)
 */
export enum UserRole {
  ADMIN = "admin",
  PEMILIH = "pemilih"
}

export interface UserAccount {
  username: string;
  password?: string; // Dalam implementasi nyata ini harus di-hash
  role: UserRole;
  fullName: string;
  poto?: string;
}

/**
 * Representasi seorang Pemilih
 */
export class Pemilih {
  id: string; // Sama dengan username
  nama: string;
  sudahMemilih: boolean;
  poto?: string;

  constructor(id: string, nama: string, poto?: string) {
    this.id = id;
    this.nama = nama;
    this.sudahMemilih = false;
    this.poto = poto;
  }
}

/**
 * Representasi seorang Kandidat
 */
export class Kandidat {
  id: string;
  nama: string;
  jumlahSuara: number;
  poto?: string;
  visi?: string;
  misi?: string;

  constructor(id: string, nama: string, poto?: string, visi?: string, misi?: string) {
    this.id = id;
    this.nama = nama;
    this.jumlahSuara = 0;
    this.poto = poto;
    this.visi = visi;
    this.misi = misi;
  }
}

/**
 * Logic utama Sistem Voting
 */
export class VotingSystem {
  pemilihList: Pemilih[] = [];
  kandidatList: Kandidat[] = [];
  users: UserAccount[] = [];

  constructor() {
    this.init();
  }

  private async init() {
    this.loadFromLocalStorage();
    await this.loadFromServer();
    
    // Default admin if no users exist
    const hasAdmin = this.users.find(u => u.username === "admin" && u.role === UserRole.ADMIN);
    if (!hasAdmin) {
      this.users.push({ username: "admin", password: "admin123", role: UserRole.ADMIN, fullName: "Administrator" });
      await this.save();
    } else {
      // Ensure specific admin credentials for this request
      if (hasAdmin.password !== "admin123") {
        hasAdmin.password = "admin123";
        await this.save();
      }
    }
  }

  private async save(): Promise<void> {
    const data = {
      pemilihList: this.pemilihList,
      kandidatList: this.kandidatList,
      users: this.users
    };
    localStorage.setItem('labkom_voting_data', JSON.stringify(data));
    try {
      await fetch('/api/voting-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (e) {
      console.error("Gagal sinkronisasi ke server:", e);
    }
  }

  private async loadFromServer(): Promise<void> {
    try {
      const resp = await fetch('/api/voting-data');
      if (!resp.ok) return;
      const parsed = await resp.json();
      if (parsed.users && parsed.users.length > 0) {
        this.updateStateFromParsed(parsed);
      }
    } catch (e) {
      console.error("Gagal memuat dari server:", e);
    }
  }

  private updateStateFromParsed(parsed: any): void {
    this.pemilihList = (parsed.pemilihList || []).map((p: any) => {
      const pemilih = new Pemilih(p.id, p.nama, p.poto);
      pemilih.sudahMemilih = p.sudahMemilih;
      return pemilih;
    });
    this.kandidatList = (parsed.kandidatList || []).map((k: any) => {
      const kand = new Kandidat(k.id, k.nama, k.poto, k.visi, k.misi);
      kand.jumlahSuara = k.jumlahSuara;
      return kand;
    });
    this.users = parsed.users || [];
  }

  private loadFromLocalStorage(): void {
    const data = localStorage.getItem('labkom_voting_data');
    if (data) {
      try {
        const parsed = JSON.parse(data);
        this.updateStateFromParsed(parsed);
      } catch (e) {
        console.error("Gagal memuat data dari localStorage:", e);
      }
    }
  }

  /**
   * Reload data from server/storage
   */
  async reload(): Promise<void> {
    await this.loadFromServer();
  }

  async register(username: string, password: string, fullName: string, poto?: string): Promise<void> {
    if (password.length < 6) {
      throw new Error("Password minimal harus 6 karakter.");
    }
    if (this.users.find(u => u.username === username)) {
      throw new Error(`Username ${username} sudah terdaftar.`);
    }
    
    // Tambah ke daftar user
    this.users.push({ username, password, fullName, role: UserRole.PEMILIH, poto });
    
    // Tambah ke daftar pemilih otomatis
    await this.tambahPemilih(username, fullName, poto);
    await this.save();
  }

  login(username: string, password: string): UserAccount {
    const user = this.users.find(u => u.username === username && u.password === password);
    if (!user) throw new Error("Username atau password salah.");
    return user;
  }

  async tambahPemilih(id: string, nama: string, poto?: string): Promise<void> {
    if (this.pemilihList.find(p => p.id === id)) {
      throw new Error(`Pemilih dengan ID ${id} sudah ada.`);
    }
    this.pemilihList.push(new Pemilih(id, nama, poto));
    await this.save();
  }

  async tambahKandidat(id: string, nama: string, poto?: string, visi?: string, misi?: string): Promise<void> {
    if (this.kandidatList.find(k => k.id === id)) {
      throw new Error(`Kandidat dengan ID ${id} sudah ada.`);
    }
    this.kandidatList.push(new Kandidat(id, nama, poto, visi, misi));
    await this.save();
  }

  async hapusPemilih(id: string): Promise<void> {
    const index = this.pemilihList.findIndex(p => p.id === id);
    if (index === -1) throw new Error("Pemilih tidak ditemukan.");
    this.pemilihList.splice(index, 1);
    
    // Hapus juga dari daftar users jika ada
    const userIndex = this.users.findIndex(u => u.username === id);
    if (userIndex !== -1) this.users.splice(userIndex, 1);
    await this.save();
  }

  async hapusKandidat(id: string): Promise<void> {
    const index = this.kandidatList.findIndex(k => k.id === id);
    if (index === -1) throw new Error("Kandidat tidak ditemukan.");
    this.kandidatList.splice(index, 1);
    await this.save();
  }

  async editPemilih(id: string, nama: string, poto?: string): Promise<void> {
    const pemilih = this.pemilihList.find(p => p.id === id);
    if (!pemilih) throw new Error("Pemilih tidak ditemukan.");
    pemilih.nama = nama;
    if (poto) pemilih.poto = poto;

    const user = this.users.find(u => u.username === id);
    if (user) {
      user.fullName = nama;
      if (poto) user.poto = poto;
    }
    await this.save();
  }

  async editKandidat(id: string, nama: string, poto?: string, visi?: string, misi?: string): Promise<void> {
    const kandidat = this.kandidatList.find(k => k.id === id);
    if (!kandidat) throw new Error("Kandidat tidak ditemukan.");
    kandidat.nama = nama;
    if (poto) kandidat.poto = poto;
    if (visi !== undefined) kandidat.visi = visi;
    if (misi !== undefined) kandidat.misi = misi;
    await this.save();
  }

  async reset(): Promise<void> {
    this.pemilihList = [];
    this.kandidatList = [];
    // Sisakan admin
    this.users = this.users.filter(u => u.role === UserRole.ADMIN);
    await this.save();
  }

  /**
   * Fungsi Voting
   */
  async berikanSuara(pemilihId: string, kandidatId: string): Promise<void> {
    const pemilih = this.pemilihList.find(p => p.id === pemilihId);
    const kandidat = this.kandidatList.find(k => k.id === kandidatId);

    if (!pemilih) throw new Error("Pemilih tidak ditemukan. Pastikan Anda terdaftar.");
    if (!kandidat) throw new Error("Kandidat tidak ditemukan.");
    
    if (pemilih.sudahMemilih) {
      throw new Error("Anda sudah menggunakan hak suara.");
    }

    kandidat.jumlahSuara += 1;
    pemilih.sudahMemilih = true;
    await this.save();
  }

  /**
   * Fungsi Hitung Hasil
   */
  hitungHasil(): { id: string, nama: string, suara: number, poto?: string }[] {
    return this.kandidatList.map(k => ({
      id: k.id,
      nama: k.nama,
      suara: k.jumlahSuara,
      poto: k.poto
    })).sort((a, b) => b.suara - a.suara);
  }
}
