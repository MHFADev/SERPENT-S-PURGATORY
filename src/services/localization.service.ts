import { Injectable, signal, effect } from '@angular/core';

export type Language = 'EN' | 'ID' | 'JP' | 'CN';

@Injectable({
  providedIn: 'root'
})
export class LocalizationService {
  currentLang = signal<Language>('EN');

  readonly translations = {
    EN: {
      TITLE: "SERPENT'S PURGATORY",
      PLAY: "ENTER ABYSS",
      LEVELS: "ZONES",
      HELP: "RITUAL",
      SETTINGS: "CONTROLS",
      BACK: "RETURN",
      OBJ_MEAT: "DEVOUR FLESH",
      OBJ_KEY: "FIND THE KEY",
      OBJ_DOOR: "ESCAPE",
      SANITY: "SANITY",
      DIED: "YOU DIED",
      WIN: "ZONE CLEARED",
      NEXT: "DESCEND",
      TRY_AGAIN: "RESURRECT",
      HELP_TEXT: "1. Guide the serpent.\n2. Devour flesh to summon the Key.\n3. Collect the Key to unlock the Gate.\n4. Enter the Gate to survive.\n\nWARNING: Sanity drains. Feed to stay sane.",
      LANG_NAME: "ENGLISH",
      SET_SIZE: "BTN SIZE",
      SET_OPACITY: "OPACITY",
      SET_X: "POS X",
      SET_Y: "POS Y",
      RESET: "RESET",
      SET_HORROR: "HORROR CFG",
      SET_SANITY_JS: "SANITY FX",
      SET_RANDOM_JS: "RANDOM SCARE",
      SET_GLITCH: "GLITCH FX",
      OPT_OFF: "OFF",
      OPT_ON: "ON",
      OPT_LOW: "LOW",
      OPT_MED: "MED",
      OPT_HIGH: "HIGH",
      HIGH_SCORE: "BEST"
    },
    ID: {
      TITLE: "SERPENT'S PURGATORY",
      PLAY: "MASUK ABYSS",
      LEVELS: "ZONA",
      HELP: "PANDUAN",
      SETTINGS: "PENGATURAN",
      BACK: "KEMBALI",
      OBJ_MEAT: "MAKAN DAGING",
      OBJ_KEY: "CARI KUNCI",
      OBJ_DOOR: "MASUK GERBANG",
      SANITY: "KEWARASAN",
      DIED: "KAMU MATI",
      WIN: "LOLOS",
      NEXT: "LANJUT",
      TRY_AGAIN: "BANGKIT",
      HELP_TEXT: "1. Kendalikan ular.\n2. Makan daging untuk memanggil Kunci.\n3. Ambil Kunci untuk buka Gerbang.\n4. Masuk Gerbang untuk selamat.\n\nPERINGATAN: Kewarasan menurun. Makan untuk tetap waras.",
      LANG_NAME: "INDONESIA",
      SET_SIZE: "UKURAN",
      SET_OPACITY: "TRANSPARANSI",
      SET_X: "POSISI X",
      SET_Y: "POSISI Y",
      RESET: "RESET",
      SET_HORROR: "HORROR CFG",
      SET_SANITY_JS: "EFEK WARAS",
      SET_RANDOM_JS: "ACAK",
      SET_GLITCH: "EFEK RUSAK",
      OPT_OFF: "MATI",
      OPT_ON: "HIDUP",
      OPT_LOW: "RNDH",
      OPT_MED: "SDNG",
      OPT_HIGH: "TGGI",
      HIGH_SCORE: "SKOR"
    },
    JP: {
      TITLE: "蛇の煉獄",
      PLAY: "深淵へ",
      LEVELS: "階層選択",
      HELP: "儀式",
      SETTINGS: "設定",
      BACK: "戻る",
      OBJ_MEAT: "肉を喰らう",
      OBJ_KEY: "鍵を探せ",
      OBJ_DOOR: "脱出せよ",
      SANITY: "正気度",
      DIED: "死亡",
      WIN: "浄化完了",
      NEXT: "次へ",
      TRY_AGAIN: "蘇生",
      HELP_TEXT: "1. 蛇を導け。\n2. 肉を喰らい、鍵を召喚せよ。\n3. 鍵を拾い、門を開け。\n4. 門に入り、生き残れ。\n\n警告：正気度は減り続ける。喰らって正気を保て。",
      LANG_NAME: "日本語",
      SET_SIZE: "ボタンサイズ",
      SET_OPACITY: "透明度",
      SET_X: "横位置",
      SET_Y: "縦位置",
      RESET: "リセット",
      SET_HORROR: "恐怖設定",
      SET_SANITY_JS: "正気演出",
      SET_RANDOM_JS: "ランダム驚",
      SET_GLITCH: "ノイズ強度",
      OPT_OFF: "無",
      OPT_ON: "有",
      OPT_LOW: "低",
      OPT_MED: "中",
      OPT_HIGH: "高",
      HIGH_SCORE: "最高"
    },
    CN: {
      TITLE: "蛇之炼狱",
      PLAY: "进入深渊",
      LEVELS: "区域选择",
      HELP: "仪式指南",
      SETTINGS: "设置",
      BACK: "返回",
      OBJ_MEAT: "吞噬血肉",
      OBJ_KEY: "寻找钥匙",
      OBJ_DOOR: "逃离",
      SANITY: "理智",
      DIED: "你死了",
      WIN: "区域清除",
      NEXT: "下潜",
      TRY_AGAIN: "复活",
      HELP_TEXT: "1. 引导巨蛇。\n2. 吞噬血肉以召唤钥匙。\n3. 拾取钥匙开启大门。\n4. 进入大门以求生。\n\n警告：理智会流逝。进食以保持理智。",
      LANG_NAME: "中文",
      SET_SIZE: "按钮大小",
      SET_OPACITY: "透明度",
      SET_X: "水平位置",
      SET_Y: "垂直位置",
      RESET: "重置",
      SET_HORROR: "恐怖设置",
      SET_SANITY_JS: "理智特效",
      SET_RANDOM_JS: "随机惊吓",
      SET_GLITCH: "故障强度",
      OPT_OFF: "关",
      OPT_ON: "开",
      OPT_LOW: "低",
      OPT_MED: "中",
      OPT_HIGH: "高",
      HIGH_SCORE: "最高分"
    }
  };

  constructor() {
    const saved = localStorage.getItem('sp_lang');
    if (saved && ['EN', 'ID', 'JP', 'CN'].includes(saved)) {
      this.currentLang.set(saved as Language);
    }

    effect(() => {
      localStorage.setItem('sp_lang', this.currentLang());
    });
  }

  toggleLang() {
    const langs: Language[] = ['EN', 'ID', 'JP', 'CN'];
    const idx = langs.indexOf(this.currentLang());
    this.currentLang.set(langs[(idx + 1) % langs.length]);
  }

  get t() {
    return this.translations[this.currentLang()];
  }
}