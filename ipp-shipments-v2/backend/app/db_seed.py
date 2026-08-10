import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import asyncio

from sqlalchemy import select

from app.db import AsyncSessionLocal
from app.models.customer import Customer
from app.models.shipper import Shipper

SHIPPERS = [
    {
        "slug": "ipp",
        "name": "IPP Lead And Metals Co., Ltd.",
        "address_line1": "92 Moo 9 Tambol Huayphai Amphur Muang",
        "address_line2": "Ratchaburi 70000 Thailand",
        "tax_id": "Tax ID- 0705562000044",
        "email": "praveen@ippresources.com",
        "brand_color": "1F4E79",
    },
    {
        "slug": "richsiri",
        "name": "Rich-Siri Metal And Trading Co., Ltd.",
        "address_line1": "89/3 Moo 1 Tambol Huayphai Amphur Muang",
        "address_line2": "Chanvat - Ratchaburi Thailand - 70000",
        "tax_id": "Tax ID- 0705562002616",
        "email": "praveen@ippresources.com",
        "brand_color": "1F7070",
    },
]

CUSTOMERS = [
    {
        "name": "Raveshia",
        "consignee_l1": "Raveshia Colours Pvt. Ltd.",
        "consignee_l2": "Plot No. 123 GIDC Dist. Bulsar Vapi-396195 Gujrat India",
        "consignee_l3": "GST- 24AAACQ0808R1Z9 PAN No.- AAACQ0808R",
        "consignee_l4": "IEC- 0302043730",
        "consignee_l5": "Email: purchase@raveshia.com",
        "notify1_l1": "Raveshia Colours Pvt. Ltd.",
        "notify1_l2": "Plot No. 123 GIDC Dist. Bulsar Vapi-396195 Gujrat India",
        "notify1_l3": "GST- 24AAACQ0808R1Z9 PAN No.- AAACQ0808R",
        "notify1_l4": "IEC- 0302043730",
        "notify1_l5": "Email: purchase@raveshia.com",
        "port_of_discharge": "Chennai India",
    },
    {
        "name": "Zetwerk",
        "consignee_l1": "To order",
        "notify1_l1": "Zetwerk Manufacturing Businesses Limited",
        "notify1_l2": "Ground & 1st Floor Survey No. 84/1 Green Glen Layout Vaishnavi Sovereign Bellandur Bengaluru Karnataka 560103",
        "notify1_l3": "PAN NUMBER: AABCZ1506C",
        "notify1_l4": "IEC CODE: AABCZ1506C GST NUMBER: 29AABCZ1506C1ZN",
        "notify2_l1": "Rite Size Inc.",
        "notify2_l2": "100 Willoughby ST 23S Brooklyn NY 11201",
        "notify3_l1": "ACE RECYCLING PTE LTD",
        "notify3_l2": "600 North Bridge Road #11-08 Parkview Square SINGAPORE 188778",
        "notify3_l3": "+91-9636789897 Siddharth.jain@ace-green.com",
        "port_of_discharge": "NHAVA SHEVA INDIA",
    },
    {
        "name": "Jain Resource",
        "consignee_l1": "To order",
        "notify1_l1": "Jain Resource Recycling Limited",
        "notify1_l2": "PLOT NO R1 & R2 SIPCOT INDUSTRIAL COMPLEX SATHYAVEDU HIGH ROAD PAPPANKUPPAM VILLAGE GUMMIDIPOONDI THIRUVALLUR 601201 TAMIL NADU",
        "notify1_l3": "PAN NUMBER: AAFCJ5145B",
        "notify1_l4": "IEC CODE: 0488048397 GST NUMBER: 33AAFCJ5145B1Z1",
        "notify1_l5": "INDIA",
        "notify2_l1": "ACE RECYCLING PTE LTD",
        "notify2_l2": "600 North Bridge Road #11-08 Parkview Square SINGAPORE 188778",
        "notify2_l3": "+91-9636789897",
        "notify2_l4": "Siddharth.jain@ace-green.com",
        "port_of_discharge": "Chennai India",
    },
    {
        "name": "HK Yesheng",
        "consignee_l1": "HONG KONG YESHENG METAL MATERIALS LIMITED",
        "consignee_l2": "ROOM C05 FLAT A 2/F TONTEX INDUSTRIAL BUILDING 2-4 SHEUNG HEI STREET SAN PO KONG HONG KONG",
        "consignee_l3": "Contact: MR.CHAN TEL: 00852-68104414",
        "consignee_l4": "Email: SERVICE001@HKYESHENG.COM",
        "notify1_l1": "STARGATE RESOURCE (HK) CO. LIMITED",
        "notify1_l2": "Room 1508 15/F Office Tower Two Grand Plaza 625 Nathan Road Kowloon Hong Kong",
        "notify1_l3": "CONTACT: IRIS XI TEL: 86-13501723247",
        "notify1_l4": "EMAIL: XIWEI@STARGATEHK.COM",
        "notify2_l1": "ACE RECYCLING PTE LTD",
        "notify2_l2": "600 NORTH BRIDGE ROAD #11-08 PARKVIEW SQUARE SINGAPORE 188778",
        "notify2_l3": "TEL: +91-9636789897",
        "notify2_l4": "MAIL: SIDDHARTH.JAIN@ACE-GREEN.COM",
        "notify3_l1": "JD Metaltech Sdn Bhd",
        "notify3_l2": "23-2 Block F2 Jalan PJU /42A Dataran Prima Malaysia - 47301",
        "port_of_discharge": "HONG KONG CHINA",
    },
    {
        "name": "BNS Korea",
        "consignee_l1": "BNS KOREA Co. Ltd.",
        "consignee_l2": "126 Songrim-Gil Chungju-City Chungbuk-Do South KOREA",
        "consignee_l3": "TEL: +82-10-8983-5278 FAX: +82-70-7614-3779",
        "consignee_l4": "E-MAIL: 68chy@naver.com",
        "consignee_l5": "CONTACT: Mr. Hoyun CHA",
        "notify1_l1": "BNS KOREA Co. Ltd.",
        "notify1_l2": "126 Songrim-Gil Chungju-City Chungbuk-Do South KOREA",
        "notify1_l3": "TEL: +82-10-8983-5278 FAX: +82-70-7614-3779",
        "notify1_l4": "E-MAIL: 68chy@naver.com",
        "notify1_l5": "CONTACT: Mr. Hoyun CHA",
        "port_of_discharge": "Busan Korea",
    },
]


async def seed() -> None:
    async with AsyncSessionLocal() as session:
        for data in SHIPPERS:
            exists = await session.scalar(select(Shipper.id).where(Shipper.slug == data["slug"]))
            if exists:
                print(f"Shipper '{data['slug']}' already exists — skipping")
                continue
            session.add(Shipper(**data))
            print(f"Seeded shipper '{data['slug']}'")

        for data in CUSTOMERS:
            exists = await session.scalar(select(Customer.id).where(Customer.name == data["name"]))
            if exists:
                print(f"Customer '{data['name']}' already exists — skipping")
                continue
            session.add(Customer(**data))
            print(f"Seeded customer '{data['name']}'")

        await session.commit()


if __name__ == "__main__":
    asyncio.run(seed())
