/** Seed data for the shop: brands, product categories, products and coupons. */

export const shopBrands =
  [
    {
      name: "اپل",
      country:
        "آمریکا",
      order: 1,
      logo: "",
    },
    {
      name: "سامسونگ",
      country:
        "کره جنوبی",
      order: 2,
      logo: "",
    },
    {
      name: "شیائومی",
      country:
        "چین",
      order: 3,
      logo: "",
    },
    {
      name: "سونی",
      country:
        "ژاپن",
      order: 4,
      logo: "",
    },
    {
      name: "ایسوس",
      country:
        "تایوان",
      order: 5,
      logo: "",
    },
    {
      name: "لنوو",
      country:
        "چین",
      order: 6,
      logo: "",
    },
    {
      name: "گوگل",
      country:
        "آمریکا",
      order: 7,
      logo: "",
    },
    {
      name: "آنکر",
      country:
        "چین",
      order: 8,
      logo: "",
    },
  ];

export const productCategories =
  [
    {
      name: "گوشی موبایل",
      color:
        "#0ea5e9",
      icon: "smartphone",
      order: 1,
      description:
        "جدیدترین گوشیهای هوشمند و تبلتها",
    },
    {
      name: "لپتاپ و کامپیوتر",
      color:
        "#2563eb",
      icon: "laptop",
      order: 2,
      description:
        "لپتاپ، کامپیوتر و لوازم جانبی",
    },
    {
      name: "هدفون و صوتی",
      color:
        "#8b5cf6",
      icon: "headphones",
      order: 3,
      description:
        "هدفون، هندزفری و اسپیکر",
    },
    {
      name: "ساعت هوشمند",
      color:
        "#14b8a6",
      icon: "watch",
      order: 4,
      description:
        "ساعت و مچبند هوشمند",
    },
    {
      name: "لوازم جانبی",
      color:
        "#f97316",
      icon: "cable",
      order: 5,
      description:
        "شارژر، پاوربانک و کابل",
    },
    {
      name: "کنسول و گیمینگ",
      color:
        "#ef4444",
      icon: "gamepad-2",
      order: 6,
      description:
        "کنسول بازی و دستهبازی",
    },
  ];

type SeedProduct =
  {
    name: string;
    brand: string;
    category: string;
    price: number;
    salePrice?: number;
    stock: number;
    rating: number;
    ratingCount: number;
    soldCount: number;
    isFeatured?: boolean;
    isNewArrival?: boolean;
    warranty?: string;
    cover: string;
    summary: string;
    specs: {
      group: string;
      name: string;
      value: string;
    }[];
  };

const img =
  (
    id: string,
  ) =>
    `https://images.unsplash.com/${id}?w=900&q=80`;

export const shopProducts: SeedProduct[] =
  [
    {
      name: "گوشی موبایل اپل iPhone 16 Pro Max ظرفیت ۲۵۶ گیگابایت",
      brand:
        "اپل",
      category:
        "گوشی موبایل",
      price: 96500000,
      salePrice: 89900000,
      stock: 12,
      rating: 4.8,
      ratingCount: 342,
      soldCount: 1890,
      isFeatured: true,
      isNewArrival: true,
      warranty:
        "۲۴ ماه گارانتی شرکتی",
      cover:
        img(
          "photo-1592750475338-74b7b21085ab",
        ),
      summary:
        "پرچمدار اپل با تراشه A18 Pro، دوربین ۴۸ مگاپیکسلی و بدنه تیتانیومی؛ انتخابی حرفهای برای عکاسی و بازی.",
      specs:
        [
          {
            group:
              "نمایشگر",
            name: "اندازه",
            value:
              "۶.۹ اینچ",
          },
          {
            group:
              "نمایشگر",
            name: "نوع",
            value:
              "Super Retina XDR",
          },
          {
            group:
              "دوربین",
            name: "دوربین اصلی",
            value:
              "۴۸ مگاپیکسل",
          },
          {
            group:
              "باتری",
            name: "ظرفیت",
            value:
              "۴۶۸۵ میلیآمپرساعت",
          },
        ],
    },
    {
      name: "گوشی موبایل سامسونگ Galaxy S24 Ultra ظرفیت ۵۱۲ گیگابایت",
      brand:
        "سامسونگ",
      category:
        "گوشی موبایل",
      price: 74900000,
      salePrice: 68900000,
      stock: 20,
      rating: 4.7,
      ratingCount: 512,
      soldCount: 2410,
      isFeatured: true,
      warranty:
        "۱۸ ماه گارانتی شرکتی",
      cover:
        img(
          "photo-1610945265064-0e34e5519bbf",
        ),
      summary:
        "پرچمدار سامسونگ با قلم S Pen و دوربین ۲۰۰ مگاپیکسلی برای ثبت جزئیات بینظیر.",
      specs:
        [
          {
            group:
              "نمایشگر",
            name: "اندازه",
            value:
              "۶.۸ اینچ",
          },
          {
            group:
              "دوربین",
            name: "دوربین اصلی",
            value:
              "۲۰۰ مگاپیکسل",
          },
          {
            group:
              "حافظه",
            name: "رم",
            value:
              "۱۲ گیگابایت",
          },
        ],
    },
    {
      name: "گوشی موبایل شیائومی Redmi Note 13 Pro ظرفیت ۲۵۶ گیگابایت",
      brand:
        "شیائومی",
      category:
        "گوشی موبایل",
      price: 18900000,
      salePrice: 16400000,
      stock: 45,
      rating: 4.5,
      ratingCount: 890,
      soldCount: 5320,
      isNewArrival: true,
      warranty:
        "۱۲ ماه گارانتی شرکتی",
      cover:
        img(
          "photo-1598327105666-5b89351aff97",
        ),
      summary:
        "میانرده محبوب شیائومی با دوربین ۲۰۰ مگاپیکسلی و شارژ سریع ۶۷ وات؛ بهترین انتخاب در بودجه محدود.",
      specs:
        [
          {
            group:
              "نمایشگر",
            name: "اندازه",
            value:
              "۶.۶۷ اینچ",
          },
          {
            group:
              "باتری",
            name: "شارژ سریع",
            value:
              "۶۷ وات",
          },
        ],
    },
    {
      name: "لپتاپ اپل MacBook Air M3 مدل ۱۳ اینچ",
      brand:
        "اپل",
      category:
        "لپتاپ و کامپیوتر",
      price: 78500000,
      stock: 8,
      rating: 4.9,
      ratingCount: 210,
      soldCount: 940,
      isFeatured: true,
      warranty:
        "۲۴ ماه گارانتی شرکتی",
      cover:
        img(
          "photo-1517336714731-489689fd1ca8",
        ),
      summary:
        "لپتاپ فوق سبک اپل با تراشه M3، عمر باتری تا ۱۸ ساعت و طراحی بدون فن.",
      specs:
        [
          {
            group:
              "پردازنده",
            name: "تراشه",
            value:
              "Apple M3",
          },
          {
            group:
              "حافظه",
            name: "رم",
            value:
              "۸ گیگابایت",
          },
          {
            group:
              "نمایشگر",
            name: "اندازه",
            value:
              "۱۳.۶ اینچ",
          },
        ],
    },
    {
      name: "لپتاپ ایسوس Zenbook 14 OLED",
      brand:
        "ایسوس",
      category:
        "لپتاپ و کامپیوتر",
      price: 52400000,
      salePrice: 47900000,
      stock: 15,
      rating: 4.6,
      ratingCount: 156,
      soldCount: 610,
      warranty:
        "۱۸ ماه گارانتی",
      cover:
        img(
          "photo-1496181133206-80ce9b88a853",
        ),
      summary:
        "اولترابوک حرفهای با نمایشگر OLED و پردازنده Intel Core Ultra برای کارهای گرافیکی و اداری.",
      specs:
        [
          {
            group:
              "پردازنده",
            name: "CPU",
            value:
              "Intel Core Ultra 7",
          },
          {
            group:
              "نمایشگر",
            name: "نوع",
            value:
              "OLED",
          },
        ],
    },
    {
      name: "هدفون بیسیم سونی WH-1000XM5",
      brand:
        "سونی",
      category:
        "هدفون و صوتی",
      price: 18900000,
      salePrice: 15900000,
      stock: 30,
      rating: 4.9,
      ratingCount: 430,
      soldCount: 1750,
      isFeatured: true,
      cover:
        img(
          "photo-1505740420928-5e560c06d30e",
        ),
      summary:
        "بهترین هدفون حذف نویز بازار با کیفیت صدای Hi-Res و ۳۰ ساعت عمر باتری.",
      specs:
        [
          {
            group:
              "صدا",
            name: "حذف نویز",
            value:
              "فعال (ANC)",
          },
          {
            group:
              "باتری",
            name: "عمر باتری",
            value:
              "۳۰ ساعت",
          },
        ],
    },
    {
      name: "هندزفری بیسیم اپل AirPods Pro نسل ۲",
      brand:
        "اپل",
      category:
        "هدفون و صوتی",
      price: 12400000,
      stock: 40,
      rating: 4.8,
      ratingCount: 620,
      soldCount: 3200,
      isNewArrival: true,
      cover:
        img(
          "photo-1600294037681-c80b4cb5b434",
        ),
      summary:
        "ایرفون اپل با حذف نویز فعال، صدای فضایی و کیس شارژ MagSafe.",
      specs:
        [
          {
            group:
              "صدا",
            name: "حذف نویز",
            value:
              "فعال (ANC)",
          },
          {
            group:
              "اتصال",
            name: "بلوتوث",
            value:
              "۵.۳",
          },
        ],
    },
    {
      name: "ساعت هوشمند اپل Watch Series 9 مدل ۴۵ میلیمتری",
      brand:
        "اپل",
      category:
        "ساعت هوشمند",
      price: 27900000,
      salePrice: 24900000,
      stock: 18,
      rating: 4.7,
      ratingCount: 280,
      soldCount: 1120,
      isFeatured: true,
      cover:
        img(
          "photo-1546868871-7041f2a55e12",
        ),
      summary:
        "ساعت هوشمند اپل با نمایشگر همیشهروشن، حسگر ضربان و پایش خواب.",
      specs:
        [
          {
            group:
              "نمایشگر",
            name: "اندازه",
            value:
              "۴۵ میلیمتر",
          },
          {
            group:
              "باتری",
            name: "عمر باتری",
            value:
              "۱۸ ساعت",
          },
        ],
    },
    {
      name: "ساعت هوشمند سامسونگ Galaxy Watch 6",
      brand:
        "سامسونگ",
      category:
        "ساعت هوشمند",
      price: 14900000,
      stock: 25,
      rating: 4.5,
      ratingCount: 190,
      soldCount: 870,
      cover:
        img(
          "photo-1523275335684-37898b6baf30",
        ),
      summary:
        "ساعت هوشمند سامسونگ با پایش سلامت پیشرفته و نمایشگر AMOLED.",
      specs:
        [
          {
            group:
              "نمایشگر",
            name: "نوع",
            value:
              "AMOLED",
          },
          {
            group:
              "سلامت",
            name: "حسگرها",
            value:
              "ضربان، SpO2، ECG",
          },
        ],
    },
    {
      name: "پاوربانک آنکر مدل PowerCore 20000 میلیآمپرساعت",
      brand:
        "آنکر",
      category:
        "لوازم جانبی",
      price: 1890000,
      salePrice: 1490000,
      stock: 80,
      rating: 4.6,
      ratingCount: 340,
      soldCount: 4100,
      cover:
        img(
          "photo-1609592806596-b43bada2f4be",
        ),
      summary:
        "پاوربانک پرظرفیت با شارژ سریع ۲۰ وات و دو پورت USB.",
      specs:
        [
          {
            group:
              "ظرفیت",
            name: "ظرفیت",
            value:
              "۲۰۰۰۰ میلیآمپرساعت",
          },
          {
            group:
              "شارژ",
            name: "توان",
            value:
              "۲۰ وات",
          },
        ],
    },
    {
      name: "شارژر دیواری سریع اپل مدل 20W",
      brand:
        "اپل",
      category:
        "لوازم جانبی",
      price: 1250000,
      stock: 60,
      rating: 4.4,
      ratingCount: 210,
      soldCount: 2600,
      cover:
        img(
          "photo-1583863788434-e58a36330cf0",
        ),
      summary:
        "شارژر ۲۰ وات اپل با پشتیبانی از شارژ سریع و طراحی جمعوجور.",
      specs:
        [
          {
            group:
              "شارژ",
            name: "توان",
            value:
              "۲۰ وات",
          },
        ],
    },
    {
      name: "کنسول بازی سونی PlayStation 5 Slim",
      brand:
        "سونی",
      category:
        "کنسول و گیمینگ",
      price: 42500000,
      salePrice: 39900000,
      stock: 6,
      rating: 4.8,
      ratingCount: 150,
      soldCount: 430,
      isFeatured: true,
      warranty:
        "۱۲ ماه گارانتی",
      cover:
        img(
          "photo-1606813907291-d86efa9b94db",
        ),
      summary:
        "کنسول نسل نهم سونی با درایو بلوری، SSD پرسرعت و پشتیبانی از 4K.",
      specs:
        [
          {
            group:
              "حافظه",
            name: "ظرفیت",
            value:
              "۱ ترابایت",
          },
          {
            group:
              "خروجی",
            name: "رزولوشن",
            value:
              "4K@120Hz",
          },
        ],
    },
    {
      name: "دسته بازی مایکروسافت Xbox Wireless Controller",
      brand:
        "سونی",
      category:
        "کنسول و گیمینگ",
      price: 3890000,
      salePrice: 3290000,
      stock: 35,
      rating: 4.5,
      ratingCount: 120,
      soldCount: 780,
      cover:
        img(
          "photo-1592840496694-26d035b52b48",
        ),
      summary:
        "دسته بازی بیسیم با طراحی ارگونومیک و اتصال بلوتوث برای PC و کنسول.",
      specs:
        [
          {
            group:
              "اتصال",
            name: "نوع",
            value:
              "بلوتوث و USB-C",
          },
        ],
    },
    {
      name: "تبلت سامسونگ Galaxy Tab S9 FE",
      brand:
        "سامسونگ",
      category:
        "گوشی موبایل",
      price: 23900000,
      stock: 14,
      rating: 4.4,
      ratingCount: 88,
      soldCount: 320,
      cover:
        img(
          "photo-1561154464-82e9adf32764",
        ),
      summary:
        "تبلت میانرده سامسونگ با قلم S Pen همراه و نمایشگر ۱۰.۹ اینچی.",
      specs:
        [
          {
            group:
              "نمایشگر",
            name: "اندازه",
            value:
              "۱۰.۹ اینچ",
          },
          {
            group:
              "باتری",
            name: "ظرفیت",
            value:
              "۸۰۰۰ میلیآمپرساعت",
          },
        ],
    },
    {
      name: "لپتاپ لنوو ThinkPad E14",
      brand:
        "لنوو",
      category:
        "لپتاپ و کامپیوتر",
      price: 41900000,
      salePrice: 37900000,
      stock: 10,
      rating: 4.3,
      ratingCount: 74,
      soldCount: 210,
      cover:
        img(
          "photo-1588872657578-7efd1f1555ed",
        ),
      summary:
        "لپتاپ اداری مقاوم لنوو با کیبورد حرفهای و امنیت سطح سازمانی.",
      specs:
        [
          {
            group:
              "پردازنده",
            name: "CPU",
            value:
              "Intel Core i7",
          },
          {
            group:
              "حافظه",
            name: "رم",
            value:
              "۱۶ گیگابایت",
          },
        ],
    },
    {
      name: "گوشی موبایل گوگل Pixel 8 Pro ظرفیت ۱۲۸ گیگابایت",
      brand:
        "گوگل",
      category:
        "گوشی موبایل",
      price: 58900000,
      stock: 9,
      rating: 4.6,
      ratingCount: 130,
      soldCount: 390,
      isNewArrival: true,
      cover:
        img(
          "photo-1598327105666-5b89351aff97",
        ),
      summary:
        "گوشی پیکسل گوگل با پردازش تصویر هوشمند و اندروید خالص.",
      specs:
        [
          {
            group:
              "دوربین",
            name: "دوربین اصلی",
            value:
              "۵۰ مگاپیکسل",
          },
          {
            group:
              "نرمافزار",
            name: "اندروید",
            value:
              "خالص + ۷ سال آپدیت",
          },
        ],
    },
  ];

export const shopCoupons =
  [
    {
      code: "WELCOME10",
      description:
        "تخفیف ۱۰٪ خوشآمدگویی برای اولین خرید",
      type: "percent" as const,
      amount: 10,
      minOrder: 500000,
      maxUses: 0,
      perUserLimit: 1,
      isActive: true,
    },
    {
      code: "TECH500",
      description:
        "تخفیف ۵۰۰ هزار تومانی روی خریدهای بالای ۵ میلیون تومان",
      type: "fixed" as const,
      amount: 500000,
      minOrder: 5000000,
      maxUses: 200,
      perUserLimit: 1,
      isActive: true,
    },
    {
      code: "FREESHIP",
      description:
        "ارسال رایگان برای سفارشهای بالای ۱ میلیون تومان",
      type: "fixed" as const,
      amount: 49000,
      minOrder: 1000000,
      maxUses: 0,
      perUserLimit: 0,
      isActive: true,
    },
  ];
