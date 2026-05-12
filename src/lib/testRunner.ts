import { VotingSystem } from "./votingLogic";

export interface TestResult {
  name: string;
  status: "PASS" | "FAIL";
  message?: string;
}

export async function runTests(): Promise<{ unit: TestResult[], integration: TestResult[] }> {
  const unitResults: TestResult[] = [];
  const integrationResults: TestResult[] = [];

  // --- UNIT TESTS ---

  // 1. Test fungsi voting
  try {
    const sys = new VotingSystem();
    await sys.tambahPemilih("P1", "User 1");
    await sys.tambahKandidat("K1", "Candidate 1");
    await sys.berikanSuara("P1", "K1");
    
    const pemilih = sys.pemilihList[0];
    const kandidat = sys.kandidatList[0];
    
    if (pemilih.sudahMemilih === true && kandidat.jumlahSuara === 1) {
      unitResults.push({ name: "Unit Test Voting", status: "PASS" });
    } else {
      unitResults.push({ name: "Unit Test Voting", status: "FAIL", message: "Status voting atau jumlah suara tidak tepat" });
    }
  } catch (e) {
    unitResults.push({ name: "Unit Test Voting", status: "FAIL", message: (e as Error).message });
  }

  // 2. Test fungsi perhitungan suara
  try {
    const sys = new VotingSystem();
    await sys.tambahKandidat("K1", "Candidate 1");
    await sys.tambahKandidat("K2", "Candidate 2");
    await sys.tambahPemilih("P1", "P1");
    await sys.tambahPemilih("P2", "P2");
    await sys.tambahPemilih("P3", "P3");
    
    await sys.berikanSuara("P1", "K1");
    await sys.berikanSuara("P2", "K1");
    await sys.berikanSuara("P3", "K2");
    
    const hasil = sys.hitungHasil();
    if (hasil[0].suara === 2 && hasil[1].suara === 1) {
      unitResults.push({ name: "Unit Test Hitung Suara", status: "PASS" });
    } else {
      unitResults.push({ name: "Unit Test Hitung Suara", status: "FAIL", message: "Perhitungan suara tidak akurat" });
    }
  } catch (e) {
    unitResults.push({ name: "Unit Test Hitung Suara", status: "FAIL", message: (e as Error).message });
  }


  // --- INTEGRATION TESTS ---

  try {
    const sys = new VotingSystem();
    // Flow: Input → Voting → Hasil
    await sys.tambahPemilih("P-INT", "Pemilih Integrasi");
    await sys.tambahKandidat("K-INT", "Kandidat Integrasi");
    await sys.berikanSuara("P-INT", "K-INT");
    const hasil = sys.hitungHasil();
    
    if (hasil.find(h => h.id === "K-INT")?.suara === 1) {
      integrationResults.push({ name: "Integration Test E-Voting", status: "PASS" });
    } else {
      integrationResults.push({ name: "Integration Test E-Voting", status: "FAIL" });
    }
  } catch (e) {
    integrationResults.push({ name: "Integration Test E-Voting", status: "FAIL", message: (e as Error).message });
  }

  return { unit: unitResults, integration: integrationResults };
}
