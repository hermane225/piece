"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
const bcrypt = __importStar(require("bcrypt"));
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
});
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
async function main() {
    console.log('🌱 Starting seed...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@piecerare.com' },
        update: {},
        create: {
            name: 'Admin',
            email: 'admin@piecerare.com',
            phone: '+22500000000',
            password: hashedPassword,
            city: 'Abidjan',
            role: 'ADMIN',
        },
    });
    console.log('✅ Admin created:', admin.email);
    const pieces = [
        {
            title: 'Écran iPhone 14 Pro Max',
            description: 'Écran original Apple OLED en parfait état. Taille 6.7 pouces, résolution 2796 x 1290. Livré avec cadre neuf.',
            price: 85000,
            condition: 'NEUF',
            brand: 'Apple',
            model: 'iPhone 14 Pro Max',
            category: 'PHONE',
            city: 'Abidjan',
            images: [
                'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800',
                'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800'
            ],
            isApproved: true,
            userId: admin.id,
        },
        {
            title: 'Batterie iPhone 13 Pro',
            description: 'Batterie originale Apple capacité 3095mAh. Durée de vie optimale. Garantie 6 mois.',
            price: 35000,
            condition: 'NEUF',
            brand: 'Apple',
            model: 'iPhone 13 Pro',
            category: 'PHONE',
            city: 'Abidjan',
            images: [
                'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=800',
                'https://images.unsplash.com/photo-1580910051074-3eb694886e34?w=800'
            ],
            isApproved: true,
            userId: admin.id,
        },
        {
            title: 'MacBook Pro 14" M3',
            description: 'Ordinateur portable Apple MacBook Pro 14 pouces M3 Pro. 18GB RAM, 512GB SSD. État quasi neuf, moins de 50 cycles de batterie.',
            price: 1200000,
            condition: 'QUASI_NEUF',
            brand: 'Apple',
            model: 'MacBook Pro 14" M3',
            category: 'PC',
            city: 'Abidjan',
            images: [
                'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800',
                'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800'
            ],
            isApproved: true,
            userId: admin.id,
        },
        {
            title: 'Écran Samsung Galaxy S23 Ultra',
            description: 'Écran AMOLED 6.8 pouces original Samsung. Refresh rate 120Hz. Qualité premium.',
            price: 75000,
            condition: 'NEUF',
            brand: 'Samsung',
            model: 'Galaxy S23 Ultra',
            category: 'PHONE',
            city: 'Abidjan',
            images: [
                'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800',
                'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800'
            ],
            isApproved: true,
            userId: admin.id,
        },
        {
            title: 'Clavier Dell XPS 15',
            description: 'Clavier de rechange pour Dell XPS 15 9520. Rétroéclairage RGB. Clavier AZERTY français.',
            price: 25000,
            condition: 'NEUF',
            brand: 'Dell',
            model: 'XPS 15 9520',
            category: 'PC',
            city: 'Abidjan',
            images: [
                'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800',
                'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800'
            ],
            isApproved: true,
            userId: admin.id,
        },
        {
            title: 'iPad Pro 12.9" M2',
            description: 'Tablette Apple iPad Pro 12.9 pouces avec puces M2. 256GB WiFi. État reconditionné grade A.',
            price: 650000,
            condition: 'RECONDITIONNE',
            brand: 'Apple',
            model: 'iPad Pro 12.9" M2',
            category: 'PC',
            city: 'Abidjan',
            images: [
                'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800',
                'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=800'
            ],
            isApproved: true,
            userId: admin.id,
        },
        {
            title: 'Caméra iPhone 14 Pro',
            description: 'Module caméra arrière triple 48MP + 12MP + 12MP. Puce A16 Bionic. Qualité photo originale.',
            price: 95000,
            condition: 'NEUF',
            brand: 'Apple',
            model: 'iPhone 14 Pro',
            category: 'PHONE',
            city: 'Abidjan',
            images: [
                'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800',
                'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800'
            ],
            isApproved: true,
            userId: admin.id,
        },
        {
            title: 'HP Spectre x360',
            description: 'PC Portable HP Spectre x360 14. Processeur Intel Core i7, 16GB RAM, 512GB SSD. Écran tactile 13.5".',
            price: 550000,
            condition: 'QUASI_NEUF',
            brand: 'HP',
            model: 'Spectre x360',
            category: 'PC',
            city: 'Abidjan',
            images: [
                'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800',
                'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800'
            ],
            isApproved: true,
            userId: admin.id,
        },
        {
            title: 'Haut-parleur iPhone 13',
            description: 'Haut-parleur externe et écouteur pour iPhone 13. Son stéréo original. Installation facile.',
            price: 15000,
            condition: 'NEUF',
            brand: 'Apple',
            model: 'iPhone 13',
            category: 'PHONE',
            city: 'Abidjan',
            images: [
                'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800',
                'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800'
            ],
            isApproved: true,
            userId: admin.id,
        },
        {
            title: 'Samsung Galaxy Tab S9',
            description: 'Tablette Samsung Galaxy Tab S9+ 12.4 pouces. 256GB, S Pen inclus. Étanche IP68.',
            price: 450000,
            condition: 'NEUF',
            brand: 'Samsung',
            model: 'Galaxy Tab S9+',
            category: 'PC',
            city: 'Abidjan',
            images: [
                'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=800',
                'https://images.unsplash.com/photo-1585790050230-5dd28404ccb9?w=800'
            ],
            isApproved: true,
            userId: admin.id,
        },
        {
            title: 'Processeur Intel Core i9-13900K',
            description: 'Processeur Intel Core i9-13900K 24 cœurs (8P+16E), 32 threads. Fréquence max 5.8GHz. Cache 36MB.',
            price: 320000,
            condition: 'NEUF',
            brand: 'Intel',
            model: 'Core i9-13900K',
            category: 'PC',
            city: 'Abidjan',
            images: [
                'https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?w=800',
                'https://images.unsplash.com/photo-1555618253-15be48c347d4?w=800'
            ],
            isApproved: true,
            userId: admin.id,
        },
        {
            title: 'Carte graphique RTX 4090',
            description: 'NVIDIA GeForce RTX 4090 24GB GDDR6X. DLSS 3, Ray Tracing. Performance extrême pour gaming et IA.',
            price: 850000,
            condition: 'NEUF',
            brand: 'NVIDIA',
            model: 'RTX 4090',
            category: 'PC',
            city: 'Abidjan',
            images: [
                'https://images.unsplash.com/photo-1555618253-15be48c347d4?w=800',
                'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800'
            ],
            isApproved: true,
            userId: admin.id,
        },
        {
            title: 'RAM DDR5 32GB Corsair',
            description: 'Kit mémoire Corsair Vengeance 32GB (2x16GB) DDR5 5600MHz. RGB. Garantie à vie.',
            price: 85000,
            condition: 'NEUF',
            brand: 'Corsair',
            model: 'Vengeance DDR5 32GB',
            category: 'PC',
            city: 'Abidjan',
            images: [
                'https://images.unsplash.com/photo-1562976540-1502c2145186?w=800',
                'https://images.unsplash.com/photo-1555618253-15be48c347d4?w=800'
            ],
            isApproved: true,
            userId: admin.id,
        },
        {
            title: 'Samsung Galaxy S24 Ultra',
            description: 'Smartphone Samsung Galaxy S24 Ultra 256GB. Écran 6.8" Dynamic AMOLED. S Pen inclus. Grade A+.',
            price: 750000,
            condition: 'QUASI_NEUF',
            brand: 'Samsung',
            model: 'Galaxy S24 Ultra',
            category: 'PHONE',
            city: 'Abidjan',
            images: [
                'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800',
                'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800'
            ],
            isApproved: true,
            userId: admin.id,
        },
        {
            title: 'SSD NVMe 2TB Samsung 990 Pro',
            description: 'Disque SSD Samsung 990 PRO 2TB NVMe PCIe 4.0. Lecture 7450MB/s, écriture 6900MB/s.',
            price: 120000,
            condition: 'NEUF',
            brand: 'Samsung',
            model: '990 PRO 2TB',
            category: 'PC',
            city: 'Abidjan',
            images: [
                'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=800',
                'https://images.unsplash.com/photo-1555618253-15be48c347d4?w=800'
            ],
            isApproved: true,
            userId: admin.id,
        },
        {
            title: 'Carte mère ASUS ROG Strix',
            description: 'Carte mère ASUS ROG Strix Z790-E Gaming WiFi. Socket LGA1700, DDR5, PCIe 5.0.',
            price: 280000,
            condition: 'NEUF',
            brand: 'ASUS',
            model: 'ROG Strix Z790-E',
            category: 'PC',
            city: 'Abidjan',
            images: [
                'https://images.unsplash.com/photo-1555618253-15be48c347d4?w=800',
                'https://images.unsplash.com/photo-1563206767-5b18f218e8de?w=800'
            ],
            isApproved: true,
            userId: admin.id,
        },
        {
            title: 'iPhone 15 Pro Max 256GB',
            description: 'Apple iPhone 15 Pro Max 256GB Titane. Écran 6.7" Super Retina XDR. Batterie 95%. Prix urgent.',
            price: 850000,
            condition: 'QUASI_NEUF',
            brand: 'Apple',
            model: 'iPhone 15 Pro Max',
            category: 'PHONE',
            city: 'Abidjan',
            images: [
                'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=800',
                'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800'
            ],
            isApproved: true,
            userId: admin.id,
        },
        {
            title: 'Alimentation 850W Corsair RM850x',
            description: 'Alimentation Corsair RM850x 850W 80+ Gold Modular. Silencieuse et fiable. Garantie 10 ans.',
            price: 75000,
            condition: 'NEUF',
            brand: 'Corsair',
            model: 'RM850x',
            category: 'PC',
            city: 'Abidjan',
            images: [
                'https://images.unsplash.com/photo-1555618253-15be48c347d4?w=800',
                'https://images.unsplash.com/photo-1563206767-5b18f218e8de?w=800'
            ],
            isApproved: true,
            userId: admin.id,
        },
        {
            title: 'Ventirad Corsair iCUE H150i',
            description: 'Système de refroidissement liquide Corsair iCUE H150i Elite 360mm. RGB. Compatible Intel/AMD.',
            price: 95000,
            condition: 'NEUF',
            brand: 'Corsair',
            model: 'iCUE H150i',
            category: 'PC',
            city: 'Abidjan',
            images: [
                'https://images.unsplash.com/photo-1555618253-15be48c347d4?w=800',
                'https://images.unsplash.com/photo-1563206767-5b18f218e8de?w=800'
            ],
            isApproved: true,
            userId: admin.id,
        },
        {
            title: 'Xiaomi Redmi Note 13 Pro',
            description: 'Smartphone Xiaomi Redmi Note 13 Pro 256GB. Écran 6.67" AMOLED 120Hz. Appareil photo 200MP.',
            price: 185000,
            condition: 'NEUF',
            brand: 'Xiaomi',
            model: 'Redmi Note 13 Pro',
            category: 'PHONE',
            city: 'Abidjan',
            images: [
                'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800',
                'https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?w=800'
            ],
            isApproved: true,
            userId: admin.id,
        },
    ];
    for (const piece of pieces) {
        const post = await prisma.post.create({
            data: piece,
        });
        console.log(`✅ Created piece: ${post.title}`);
    }
    console.log('🌱 Seed completed!');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map