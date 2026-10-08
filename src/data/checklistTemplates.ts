import { InspectionCategoryTemplate, Vehicle, InspectionRecord, ChecklistTemplatesState } from '../types/vehicle';

export const GENERAL_VEHICLE_CHECKLIST: InspectionCategoryTemplate[] = [
  {
    category: '1. ของเหลวและห้องเครื่องยนต์',
    items: [
      { id: 'gen_eng_oil', title: 'ระดับน้ำมันเครื่อง', description: 'ก้านวัดระดับน้ำมันอยู่ในเกณฑ์ปกติ (Min-Max) สีไม่ดำข้นผิดปกติ' },
      { id: 'gen_brake_fluid', title: 'ระดับน้ำมันเบรก / คลัตช์', description: 'ระดับน้ำมันในกระปุกอยู่ในเกณฑ์กำหนด ไม่รั่วซึม' },
      { id: 'gen_coolant', title: 'ระดับน้ำหล่อเย็นในหม้อน้ำและถังพัก', description: 'ระดับน้ำหล่อเย็นไม่แห้งหรือต่ำกว่าเกณฑ์ ฝาปิดสนิท' },
      { id: 'gen_washer_fluid', title: 'น้ำฉีดกระจก', description: 'มีน้ำเพียงพอ หัวฉีดไม่อุดตัน' },
      { id: 'gen_leaks', title: 'การรั่วซึมใต้ท้องรถและห้องเครื่อง', description: 'ไม่มีคราบน้ำมันหรือน้ำหยดผิดปกติใต้ท้องรถ' },
      { id: 'gen_battery', title: 'สภาพแบตเตอรี่และขั้วต่อ', description: 'ขั้วแน่น ไม่มีขี้เกลือเกาะ สายไฟไม่อยู่ในสภาพชำรุด' },
    ],
  },
  {
    category: '2. ระบบไฟส่องสว่างและสัญญาณ',
    items: [
      { id: 'gen_headlights', title: 'ไฟหน้า (ไฟต่ำ / ไฟสูง)', description: 'ติดครบสองข้าง สว่างปกติ ปรับระดับได้' },
      { id: 'gen_turn_signals', title: 'ไฟเลี้ยว (หน้า-หลัง ซ้าย-ขวา)', description: 'กะพริบปกติ จังหวะสม่ำเสมอทั้งซ้ายและขวา' },
      { id: 'gen_brake_lights', title: 'ไฟเบรก และไฟเบรกดวงที่ 3', description: 'สว่างชัดเจนเมื่อเหยียบเบรก' },
      { id: 'gen_reverse_lights', title: 'ไฟถอยหลัง และสัญญาณเสียงเตือนถอย', description: 'ติดเมื่อเข้าเกียร์ถอยหลัง พร้อมสัญญาณเสียงทำงาน' },
      { id: 'gen_hazard_lights', title: 'ไฟฉุกเฉิน (ไฟผ่าหมาก)', description: 'กะพริบพร้อมกัน 4 จุด เมื่อกดสวิตช์' },
      { id: 'gen_horn', title: 'สัญญาณแตรรถ', description: 'เสียงดังชัดเจน ไม่ขาดหาย' },
    ],
  },
  {
    category: '3. ยาง ล้อ และช่วงล่าง',
    items: [
      { id: 'gen_tire_pressure', title: 'แรงดันลมยางทั้ง 4 ล้อ', description: 'แรงดันลมยางไม่อ่อนหรือแข็งเกินเกณฑ์' },
      { id: 'gen_tire_condition', title: 'สภาพดอกยางและแก้มยาง', description: 'ดอกยางลึกพอ ไม่บวม ไม่มีรอยแตกหรือตะปูตำ' },
      { id: 'gen_wheel_nuts', title: 'น็อตล้อทุกตัว', description: 'ขันแน่นครบทุกตัว ไม่มีน็อตหลวมหรือสูญหาย' },
      { id: 'gen_spare_tire', title: 'ยางอะไหล่และอุปกรณ์เปลี่ยนยาง', description: 'มีลมยางอะไหล่ แม่แรง และประแจขันล้อพร้อมใช้' },
    ],
  },
  {
    category: '4. ระบบควบคุมและเบรก',
    items: [
      { id: 'gen_foot_brake', title: 'แป้นเบรกเท้า', description: 'ระยะเหยียบปกติ เบรกไม่จม ไม่ยวบยาบ' },
      { id: 'gen_hand_brake', title: 'เบรกมือ / เบรกจอด', description: 'ดึงล็อกแน่นหนา ปลดล็อกคลายตัวได้ดี' },
      { id: 'gen_steering', title: 'พวงมาลัยและการบังคับเลี้ยว', description: 'ไม่มีอาการหลวมคลอน ระยะฟรีปกติ หมุนไม่ติดขัด' },
      { id: 'gen_dashboard_warning', title: 'ไฟเตือนบนหน้าปัดเรือนไมล์', description: 'ไม่มีไฟเตือน Check Engine / ABS / Airbag / Battery ค้าง' },
    ],
  },
  {
    category: '5. อุปกรณ์ความปลอดภัยและภายในรถ',
    items: [
      { id: 'gen_seatbelts', title: 'เข็มขัดนิรภัยทุกตำแหน่ง', description: 'ดึงล็อกกระชากได้ปกติ สลักเสียบแน่น' },
      { id: 'gen_mirrors', title: 'กระจกมองข้างและกระจกมองหลัง', description: 'สะอาด ไม่แตก ปรับมุมมองได้ชัดเจน' },
      { id: 'gen_wipers', title: 'ที่ปัดน้ำฝนและยางปัด', description: 'ปัดกระจกสะอาด ยางไม่แข็งกรอบหรือฉีกขาด' },
      { id: 'gen_fire_extinguisher', title: 'ถังดับเพลิงประจำรถ', description: 'เกจวัดแรงดันอยู่ในแถบเขียว ไม่หมดอายุ พร้อมใช้' },
      { id: 'gen_emergency_signs', title: 'ป้ายสะท้อนแสง / กรวยจราจร', description: 'มีกรวยหรือป้ายสามเหลี่ยมสะท้อนแสงฉุกเฉินในรถ' },
      { id: 'gen_docs', title: 'สมุดคู่มือรถ / พ.ร.บ. / ป้ายภาษี', description: 'ป้ายภาษีไม่หมดอายุ พกสำเนาเล่มทะเบียนรถ' },
    ],
  },
];

export const CRANE_TRUCK_CHECKLIST: InspectionCategoryTemplate[] = [
  {
    category: '1. ระบบตัวรถบรรทุกและระบบขับเคลื่อน (Truck Chassis & Safety)',
    items: [
      { id: 'crn_eng_oil_coolant', title: 'ระดับน้ำมันเครื่องและน้ำหล่อเย็นเครื่องยนต์', description: 'อยู่ในเกณฑ์ปกติ ไม่ขาด ไม่มีความร้อนผิดปกติ' },
      { id: 'crn_air_brake', title: 'ระบบลมเบรกและเกจ์วัดความดันลม (Air Brake Pressure)', description: 'แรงดันลมสะสมได้ตามเกณฑ์ ไม่มีลมรั่วฟ่อ' },
      { id: 'crn_lighting_signals', title: 'ระบบไฟส่องสว่าง ไฟเลี้ยว ไฟเบรก และไฟวับวาบฉุกเฉิน', description: 'ระบบไฟส่องสว่างรอบตัวรถและไฟไซเรนบนหลังคาทำงานครบถ้วน' },
      { id: 'crn_tires_wheels', title: 'สภาพยาง ล้อคู่หลัง และน็อตล้อทุกล้อ', description: 'ดอกยางลึก น็อตล้อขันแน่นทุกตัว ไม่มีรอยฉีกขาดหรือบวม' },
      { id: 'crn_reverse_buzzer', title: 'สัญญาณเสียงถอยหลังและไฟถอย', description: 'เสียงสัญญาณเตือนถอยหลังดังชัดเจนเพื่อความปลอดภัย' },
      { id: 'crn_safety_gear', title: 'ถังดับเพลิง หมวกนิรภัย และกรวยสะท้อนแสง', description: 'อุปกรณ์ความปลอดภัยส่วนบุคคล (PPE) ประจำรถครบถ้วน' },
    ],
  },
  {
    category: '2. ระบบขาหยั่งค้ำยันไฮดรอลิค (Outriggers / Jack Cylinders)',
    items: [
      { id: 'crn_outriggers_movement', title: 'ขาหยั่งค้ำยันไฮดรอลิค กางออก-เก็บเข้า', description: 'กางออกได้สุดและตั้งลงพื้นได้มั่นคง ขาไม่ติดขัด' },
      { id: 'crn_outrigger_cylinders', title: 'กระบอกไฮดรอลิกขาหยั่งและซีลกันน้ำมัน', description: 'ไม่มีคราบน้ำมันไฮดรอลิกรั่วซึมที่กระบอกหรือข้อต่อ' },
      { id: 'crn_outrigger_pads', title: 'แผ่นรองขาค้ำยัน (Outrigger Pads)', description: 'มีแผ่นรองเหล็ก/ไม้เนื้อแข็งครบ 4 จุด สภาพสมบูรณ์ไม่แตกหัก' },
      { id: 'crn_outrigger_pins', title: 'สลักล็อกนิรภัยขาค้ำยัน (Safety Pins & Locks)', description: 'สลักล็อกแน่นหนา ป้องกันขาหยั่งเลื่อนหลุดขณะขับขี่' },
      { id: 'crn_level_bubble', title: 'เกจวัดระดับน้ำระนาบตัวรถ (Level Bubble / Indicator)', description: 'เกจวัดระดับสมบูรณ์ ใช้งานเพื่อปรับระนาบรถก่อนยกงาน' },
    ],
  },
  {
    category: '3. ระบบแขนบูมและโครงสร้างเครน (Crane Boom Structure)',
    items: [
      { id: 'crn_boom_structure', title: 'โครงสร้างบูมเครน (Boom Structure)', description: 'ไม่มีรอยร้าว รอยเชื่อมไม่แตก บูมไม่งอ บิดเบี้ยว หรือยุบตัว' },
      { id: 'crn_boom_pins', title: 'สลักข้อต่อบูมและกิ๊บล็อก (Boom Pivot Pins)', description: 'สลักยึดแน่นหนา มีตัวล็อกครบ ไม่หลวมคลอน' },
      { id: 'crn_lift_cylinders', title: 'กระบอกไฮดรอลิกยกบูมและกระบอกยืดบูม (Lift & Telescopic)', description: 'แกนกระบอกเรียบ ไม่มีรอยขูดขีด ลิฟต์บูมขึ้น-ลงราบรื่น' },
      { id: 'crn_load_chart', title: 'ป้ายพิกัดยกน้ำหนักและตารางรัศมี (Load Capacity Chart)', description: 'ป้ายบอกพิกัดยกน้ำหนักติดชัดเจน ไม่ลบเลือน อ่านค่าได้ง่าย' },
    ],
  },
  {
    category: '4. ระบบวินช์ สลิง และตะขอยก (Winch, Wire Rope & Hook)',
    items: [
      { id: 'crn_wire_rope', title: 'ลวดสลิงยกของ (Hoist Wire Rope)', description: 'สลิงไม่แตกเกลียว ไม่คดงอ ไม่มีสนิมกร่อน ปลายยึดแน่น' },
      { id: 'crn_drum_spooling', title: 'การม้วนเรียงตัวของสลิงบนดรัมวินช์', description: 'สลิงเรียงแถวเรียบร้อย ไม่ปีนทับเกลียว ไม่หลุดขอบรอก' },
      { id: 'crn_hook_safety_latch', title: 'ตะขอยกและปากล็อกนิรภัย (Hook & Safety Latch)', description: 'ตะขอไม่บิดงอหรือร้าว ปากล็อกนิรภัยมีสปริงดีดปิดสนิท' },
      { id: 'crn_sheaves', title: 'ลูกรอกปลายบูม (Boom Point Sheaves)', description: 'ลูกรอกหมุนคล่อง ร่องรอกไม่สึกแหว่ง สลิงไม่ตกจากร่อง' },
    ],
  },
  {
    category: '5. ระบบไฮดรอลิคและอุปกรณ์ตัดความปลอดภัยเครน (Crane Hydraulics & Safety Systems)',
    items: [
      { id: 'crn_control_levers', title: 'คันโยกควบคุมเครน (Control Levers / Joy Stick)', description: 'คันโยกดีดกลับตำแหน่งกึ่งกลาง (Neutral) ได้เองเมื่อปล่อยมือ' },
      { id: 'crn_anti_two_block', title: 'ระบบตัดยกสุดปลายบูม (Anti-Two Block / Limit Switch)', description: 'เมื่อตะขอยกแตะสวิตช์ ระบบจะตัดการยกทันที ป้องกันสลิงขาด' },
      { id: 'crn_holding_valves', title: 'วาล์วนิรภัยล็อกไฮดรอลิก (Check / Holding Valves)', description: 'เมื่อยกบูมค้างไว้ บูมไม่ทรุดตัวลงเอง น้ำมันไม่ไหลย้อน' },
      { id: 'crn_hydraulic_oil', title: 'ระดับน้ำมันไฮดรอลิกในถังพัก (Hydraulic Oil Level)', description: 'ระดับน้ำมันในหลอดแก้วอยู่ในเกณฑ์ ไม่มีฟองอากาศหรือสีขุ่น' },
      { id: 'crn_emergency_stop', title: 'ปุ่มหยุดฉุกเฉิน (Emergency Stop Button)', description: 'กดแล้วตัดการทำงานของระบบเครนทันที' },
    ],
  },
];

export const BUCKET_TRUCK_CLASS_C_CHECKLIST: InspectionCategoryTemplate[] = [
  {
    category: '1. ระบบตัวรถบรรทุกและระบบขับเคลื่อนกำลังส่ง PTO (Truck Chassis & PTO)',
    items: [
      { id: 'bkc_eng_coolant', title: 'ระดับน้ำมันเครื่อง น้ำหล่อเย็น และน้ำมันพาวเวอร์', description: 'ระดับของเหลวในห้องเครื่องอยู่ในเกณฑ์ปกติ ไม่มีการรั่วซึม' },
      { id: 'bkc_air_brake', title: 'ระบบลมเบรก เกจ์วัดแรงดันลม และระบบเบรกจอด', description: 'แรงดันลมเบรกสะสมได้เกิน 7-8 บาร์ และระบบเบรกจอดล็อกแน่นหนา' },
      { id: 'bkc_pto_engagement', title: 'ระบบส่งกำลังเพลา PTO (Power Take-Off)', description: 'เข้าเกียร์ PTO ได้นิ่มนวล ปั๊มไฮดรอลิกทำงานปกติ ไม่มีเสียงกระแทก' },
      { id: 'bkc_tires_lighting', title: 'สภาพยาง ล้อคู่หลัง สัญญาณไฟ และไฟไซเรนวับวาบ', description: 'ดอกยางลึก น็อตล้อแน่น ไฟส่องสว่างรอบรถและไฟไซเรนบนหลังคาติดครบ' },
      { id: 'bkc_reverse_ppe', title: 'สัญญาณเตือนถอยหลัง ถังดับเพลิง และอุปกรณ์ PPE ประจำรถ', description: 'สัญญาณเตือนถอยหลังดังปกติ มีถังดับเพลิงและหมวกนิรภัยประจำรถ' },
    ],
  },
  {
    category: '2. ระบบขาหยั่งค้ำยันไฮดรอลิคและระบบสายดินตัวรถ (Outriggers & Grounding)',
    items: [
      { id: 'bkc_outriggers_movement', title: 'ขาหยั่งค้ำยันไฮดรอลิคหน้า-หลัง กางออกและตั้งพื้น', description: 'กางออกได้สุดและดันยกลอยตัวรถได้ระดับมั่นคง ไม่ติดขัด' },
      { id: 'bkc_outrigger_pads_pins', title: 'แผ่นรองขาค้ำยัน (Outrigger Pads) และสลักล็อกนิรภัย', description: 'แผ่นรองฉนวน/เหล็กครบ 4 จุด สลักล็อกขาค้ำยึดแน่น ไม่หลุดหลวม' },
      { id: 'bkc_level_indicator', title: 'เกจวัดระดับน้ำระนาบตัวรถ (Level Bubble Indicator)', description: 'อ่านค่าได้ชัดเจน ปรับตั้งตัวรถให้อยู่ในแนวนอนได้ระดับก่อนยกบูม' },
      { id: 'bkc_grounding_cable', title: 'สายดินต่อลงดินชั่วคราวประจำรถกระเช้า (Vehicle Protective Ground)', description: 'สายทองแดงขนาดไม่น้อยกว่า 50 sq.mm. แคลมป์กราวด์สะอาด ยึดแน่นหนา' },
      { id: 'bkc_outrigger_interlock', title: 'ระบบอินเตอร์ล็อกขาค้ำยัน (Outrigger / Boom Interlock)', description: 'บูมจะไม่สามารถยกทำงานได้หากขาหยั่งค้ำยันยังไม่ได้กางลงพื้นสมบูรณ์' },
    ],
  },
  {
    category: '3. บูมฉนวนไฟฟ้าและการรับรอง Dielectric (Insulated Boom & Dielectric Section - Class C)',
    items: [
      { id: 'bkc_fiberglass_boom', title: 'ผิวบูมฉนวนไฟเบอร์กลาสท่อนบน (Insulated Upper Boom Class C)', description: 'ผิวสะอาด แห้ง เป็นมันเงา ไม่มีคราบเขม่า น้ำมัน รอยขูดลึก หรือรอยแตกกะเทาะ' },
      { id: 'bkc_dielectric_cert', title: 'ป้ายรับรองการทดสอบฉนวนไฟฟ้า (Dielectric Test Certification)', description: 'มีสติ๊กเกอร์รับรองผลการทดสอบทางไฟฟ้าประจำปี และยังไม่หมดอายุ' },
      { id: 'bkc_lower_boom_insert', title: 'ท่อนฉนวนบูมท่อนล่าง (Lower Boom Insulator Insert - ถ้ามี)', description: 'สะอาด แห้ง ไร้คราบสิ่งสกปรกนำไฟฟ้าและรอยแตกร้าว' },
      { id: 'bkc_boom_leveling_rods', title: 'ก้านส่งกำลังปรับระดับฉนวนและท่อไฮดรอลิกฉนวนภายในบูม', description: 'ไม่มีคราบน้ำมันไฮดรอลิกรั่วซึม ไม่มีการเสียดสีหรือสึกหรอผิดปกติ' },
    ],
  },
  {
    category: '4. ตัวกระเช้าไฟเบอร์กลาส ถังรองฉนวน และระบบปรับระดับ (Bucket & Liner 46-50kV)',
    items: [
      { id: 'bkc_bucket_fiberglass', title: 'ตัวกระเช้าไฟเบอร์กลาส (Fiberglass Bucket)', description: 'โครงสร้างแข็งแรง ไม่มีรอยแตกหักหรือร้าวที่จุดยึดกระเช้า' },
      { id: 'bkc_bucket_liner', title: 'ถังรองฉนวนภายในกระเช้า (Bucket Liner - Insulated 50kV)', description: 'สะอาด แห้งสนิท ไม่มีน้ำขัง ไม่มีรอยแตกร้าวหรือทะลุ' },
      { id: 'bkc_auto_leveling', title: 'ระบบปรับระดับกระเช้าอัตโนมัติ (Bucket Auto-Leveling)', description: 'กระเช้ารักษาระดับขนานพื้นราบตลอดการยก-ลดบูม ไม่เอียงกระดก' },
      { id: 'bkc_safety_harness_anchor', title: 'จุดยึดเข็มขัดนิรภัย (Harness Anchor) และ Safety Lanyard', description: 'ห่วงยึดเข็มขัดนิรภัยแข็งแรง พร้อมสายนิรภัยดูดซับแรงกระชาก (Shock Absorbing Lanyard)' },
    ],
  },
  {
    category: '5. ชุดควบคุมและการควบคุมฉุกเฉิน (Upper/Lower Controls & Emergency Systems)',
    items: [
      { id: 'bkc_upper_controls', title: 'ชุดควบคุมบนกระเช้า (Upper Controls)', description: 'คันโยกและปุ่มกดทำงานราบรื่น ดีดกลับกึ่งกลางปกติ ไม่ติดขัด' },
      { id: 'bkc_lower_controls_override', title: 'ชุดควบคุมฐานล่างและระบบเลือกสิทธิ์ (Lower Controls Override)', description: 'สวิตช์สลับการควบคุมบน-ล่างทำงานปกติ สามารถควบคุมจากฐานล่างเพื่อช่วยเหลือฉุกเฉินได้' },
      { id: 'bkc_foot_switch', title: 'สวิตช์เหยียบเท้าเพื่อความปลอดภัย (Safety Foot Switch / Deadman)', description: 'ต้องเหยียบสวิตช์เท้าก่อนเท่านั้น ชุดควบคุมจึงจะยอมให้บูมเคลื่อนที่' },
      { id: 'bkc_emergency_power_unit', title: 'ระบบนำกระเช้าลงฉุกเฉิน (Emergency Auxiliary DC Pump / Lowering Valve)', description: 'ปั๊มไฟฟ้าสำรอง DC หรือวาล์วนำกระเช้าลงฉุกเฉินทำงานปกติเมื่อดับเครื่องยนต์' },
      { id: 'bkc_emergency_stop_upper_lower', title: 'ปุ่มหยุดฉุกเฉิน (E-Stop) ทั้งบนกระเช้าและฐานล่าง', description: 'กดแล้วระบบตัดการทำงานและการจ่ายน้ำมันไฮดรอลิกทันที' },
    ],
  },
];

export const INITIAL_CHECKLIST_TEMPLATES: ChecklistTemplatesState = {
  general: GENERAL_VEHICLE_CHECKLIST,
  crane_truck: CRANE_TRUCK_CHECKLIST,
  bucket_truck_class_c: BUCKET_TRUCK_CLASS_C_CHECKLIST,
};

export const INITIAL_VEHICLES: Vehicle[] = [
  {
    id: 'veh-001',
    licensePlate: 'ขก-4521',
    province: 'เชียงใหม่',
    peaBranch: 'กฟจ.เชียงใหม่',
    category: 'general',
    vehicleType: 'pickup',
    brand: 'Toyota',
    model: 'Hilux Revo 4WD',
    department: 'แผนกปฏิบัติการระบบไฟฟ้า (กฟภ.)',
    lastOdometer: 142350,
    fuelType: 'diesel',
    status: 'ready',
    notes: 'รถตรวจการและแก้ไขระบบจำหน่ายไฟฟ้า พร้อมบันไดพับ',
    createdAt: '2026-01-15T08:00:00Z',
    updatedAt: '2026-10-06T14:30:00Z',
  },
  {
    id: 'veh-002',
    licensePlate: '83-9912',
    province: 'กรุงเทพมหานคร',
    peaBranch: 'กฟภ. สำนักงานใหญ่',
    category: 'bucket_truck_class_c',
    vehicleType: 'bucket_truck_class_c',
    brand: 'Hino',
    model: '500 Series รถกระเช้าฉนวนไฟฟ้า Class C (46kV)',
    department: 'แผนกฮอทไลน์และบำรุงรักษาสายส่ง 22-33kV',
    lastOdometer: 89420,
    fuelType: 'diesel',
    status: 'ready',
    notes: 'รถกระเช้าฉนวนไฟฟ้า Class C สำหรับงานบำรุงรักษาระบบจำหน่ายแรงสูงโดยไม่ดับไฟ (Hotline Live Line) ทดสอบ Dielectric ประจำปีแล้ว',
    createdAt: '2026-02-10T09:00:00Z',
    updatedAt: '2026-10-05T17:15:00Z',
  },
  {
    id: 'veh-003',
    licensePlate: 'นข-7810',
    province: 'พิษณุโลก',
    peaBranch: 'กฟจ.พิษณุโลก',
    category: 'general',
    vehicleType: 'van',
    brand: 'Toyota',
    model: 'Commuter 2.8 D4D',
    department: 'แผนกบริหารงานทั่วไปและขนส่ง',
    lastOdometer: 64120,
    fuelType: 'diesel',
    status: 'ready',
    notes: 'รถตู้รับรองและขนส่งเจ้าหน้าที่ตรวจงาน',
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-10-06T09:00:00Z',
  },
  {
    id: 'veh-004',
    licensePlate: 'บท-3345',
    province: 'นครราชสีมา',
    peaBranch: 'กฟจ.นครราชสีมา',
    category: 'crane_truck',
    vehicleType: 'crane_truck',
    brand: 'Isuzu',
    model: 'Forward 10 ล้อติดเครนไฮดรอลิค 8 ตัน',
    department: 'แผนกบำรุงรักษาสถานีไฟฟ้าและหม้อแปลง',
    lastOdometer: 112500,
    fuelType: 'diesel',
    status: 'needs_attention',
    notes: 'ไฟเลี้ยวหลังขวาครอบหลวม วาล์วไฮดรอลิกขาหยั่งหลังขวามีคราบซึมเล็กน้อย',
    createdAt: '2026-04-12T11:00:00Z',
    updatedAt: '2026-10-04T16:00:00Z',
  },
  {
    id: 'veh-005',
    licensePlate: 'ผก-6623',
    province: 'ขอนแก่น',
    peaBranch: 'กฟจ.ขอนแก่น',
    category: 'general',
    vehicleType: 'pickup',
    brand: 'Isuzu',
    model: 'D-Max 4x4 Crew Cab',
    department: 'แผนกก่อสร้างและซ่อมบำรุงสายส่ง',
    lastOdometer: 78500,
    fuelType: 'diesel',
    status: 'ready',
    notes: 'ติดตั้งไซเรนสีเหลืองและวิทยุสื่อสารประจำ กฟภ.',
    createdAt: '2026-05-15T08:30:00Z',
    updatedAt: '2026-10-06T11:20:00Z',
  },
  {
    id: 'veh-006',
    licensePlate: '84-1205',
    province: 'ชลบุรี',
    peaBranch: 'กฟจ.ชลบุรี',
    category: 'bucket_truck_class_c',
    vehicleType: 'bucket_truck_class_c',
    brand: 'Isuzu',
    model: 'FRR 210 รถกระเช้าฉนวนไฟฟ้า Class C',
    department: 'แผนกฮอทไลน์และสายส่งไฟฟ้าแรงสูง',
    lastOdometer: 52100,
    fuelType: 'diesel',
    status: 'ready',
    notes: 'กระเช้าฉนวนทนแรงดัน 46kV สำหรับงานซ่อมบำรุงพื้นที่นิคมอุตสาหกรรม',
    createdAt: '2026-06-20T09:15:00Z',
    updatedAt: '2026-10-07T08:00:00Z',
  },
];

export const INITIAL_INSPECTIONS: InspectionRecord[] = [
  {
    id: 'insp-1001',
    vehicleId: 'veh-001',
    vehicleLicensePlate: 'ขก-4521',
    peaBranch: 'กฟจ.เชียงใหม่',
    vehicleCategory: 'general',
    vehicleType: 'pickup',
    brand: 'Toyota',
    model: 'Hilux Revo 4WD',
    department: 'แผนกปฏิบัติการระบบไฟฟ้า (กฟภ.)',
    inspectionDate: '2026-10-06T08:15:00Z',
    odometer: 142350,
    inspectorName: 'นายสมชาย ใจมั่น',
    inspectorPhone: '081-234-5678',
    workDescription: 'ออกตรวจแก้ไฟขัดข้อง โซน อ.แม่ริม',
    items: GENERAL_VEHICLE_CHECKLIST.flatMap(cat => 
      cat.items.map(i => ({
        id: i.id,
        category: cat.category,
        title: i.title,
        description: i.description,
        status: 'pass' as const,
        remark: '',
      }))
    ),
    overallStatus: 'ready',
    summaryRemarks: 'สภาพรถสมบูรณ์ดีมาก พร้อมปฏิบัติงานภาคสนาม',
    syncedToSheets: true,
    createdAt: '2026-10-06T08:15:00Z',
  },
  {
    id: 'insp-1002',
    vehicleId: 'veh-004',
    vehicleLicensePlate: 'บท-3345',
    peaBranch: 'กฟจ.นครราชสีมา',
    vehicleCategory: 'crane_truck',
    vehicleType: 'crane_truck',
    brand: 'Isuzu',
    model: 'Forward 10 ล้อติดเครนไฮดรอลิค 8 ตัน',
    department: 'แผนกบำรุงรักษาสถานีไฟฟ้าและหม้อแปลง',
    inspectionDate: '2026-10-04T07:45:00Z',
    odometer: 112500,
    inspectorName: 'นายประสิทธิ์ มั่นคง',
    inspectorPhone: '089-876-5432',
    workDescription: 'ขนย้ายหม้อแปลง 250 kVA และปักเสาไฟฟ้าแรงสูง',
    items: CRANE_TRUCK_CHECKLIST.flatMap(cat => 
      cat.items.map(i => {
        if (i.id === 'crn_outrigger_cylinders') {
          return {
            id: i.id,
            category: cat.category,
            title: i.title,
            description: i.description,
            status: 'fail' as const,
            remark: 'กระบอกขาหยั่งหลังขวามีคราบน้ำมันซึม เช็ดทำความสะอาดและเฝ้าระวัง',
          };
        }
        return {
          id: i.id,
          category: cat.category,
          title: i.title,
          description: i.description,
          status: 'pass' as const,
          remark: '',
        };
      })
    ),
    overallStatus: 'conditional',
    summaryRemarks: 'ขาหยั่งค้ำยันทำงานได้ ยกงานน้ำหนักไม่เกิน 5 ตันได้ นัดเปลี่ยนซีลไฮดรอลิกเย็นนี้',
    syncedToSheets: true,
    createdAt: '2026-10-04T07:45:00Z',
  },
];
