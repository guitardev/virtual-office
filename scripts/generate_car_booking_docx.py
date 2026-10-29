#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generate filled official Car Booking Request Word Document (.docx)
Based on official provincial template in FormTemplates/Form_ขอใช้รถ.docx
"""

import sys
import json
import os
import docx
from docx.shared import Pt

def set_p_text(p, text, font_name="TH SarabunPSK", font_size=16, bold=False):
    p.text = text
    for r in p.runs:
        r.font.name = font_name
        r.font.size = Pt(font_size)
        r.bold = bold

def generate_booking_docx(input_json_str, output_path):
    template_path = os.path.join(os.path.dirname(__file__), "..", "FormTemplates", "Form_ขอใช้รถ.docx")
    template_path = os.path.abspath(template_path)
    if not os.path.exists(template_path):
        raise FileNotFoundError(f"Template not found at: {template_path}")

    booking_data = json.loads(input_json_str)
    doc = docx.Document(template_path)

    # Extract fields
    req_name = booking_data.get('requesterName', '')
    req_pos = booking_data.get('requesterPosition', '')
    veh_name = booking_data.get('vehicleName', '')
    lic_plate = booking_data.get('licensePlate', '')
    driver = booking_data.get('assignedDriver', '')
    if not driver or driver == "ขับขี่เองโดยผู้ขอใช้รถ" or driver == "ขับขี่เอง":
        if booking_data.get('requireDriver') is False or not driver:
            driver = req_name if req_name else "ผู้ขอใช้รถ"
    import re
    driver = re.sub(r'\s*\(.*?\)\s*', '', driver).strip()
    dest = booking_data.get('destination', '')
    purpose = booking_data.get('purpose', '')
    passengers = booking_data.get('passengersList', '')
    passenger_count = str(booking_data.get('passengerCount', 1))
    distance = str(booking_data.get('estimatedDistance', 150))
    start_date = booking_data.get('startDateThai', '')
    start_time = booking_data.get('startTime', '')
    end_date = booking_data.get('endDateThai', '')
    end_time = booking_data.get('endTime', '')
    fuel_amount = str(booking_data.get('fuelBudgetAmount', '')) if booking_data.get('fuelBudgetRequested') else ''
    day = booking_data.get('day', '')
    month = booking_data.get('month', '')
    year = booking_data.get('year', '')

    # Division Reviewer (Block 2)
    div_reviewer_name = booking_data.get('divisionReviewerName', '')
    div_reviewer_pos = booking_data.get('divisionReviewerPosition', '')
    div_reviewer_date = booking_data.get('divisionReviewerDate', '')

    # Admin Head (Block 3)
    admin_head_name = booking_data.get('adminHeadName') or booking_data.get('managerName', '')
    admin_head_pos = booking_data.get('adminHeadPosition', 'นักพัฒนาสังคมชำนาญการ')
    if "(หัวหน้าฝ่ายบริหารทั่วไป)" in admin_head_pos:
        admin_head_pos = admin_head_pos.replace("(หัวหน้าฝ่ายบริหารทั่วไป)", "").strip()
    admin_head_notes = booking_data.get('adminHeadNotes') or booking_data.get('managerNotes', 'เพื่อโปรดพิจารณาอนุญาต')
    admin_head_date = booking_data.get('adminHeadDate', '')

    # Approver (Block 4) - Fixed to Provincial Director
    is_approved = booking_data.get('status') == 'approved'
    is_rejected = booking_data.get('status') == 'rejected'
    approver_name = "นางสาวมะลิวัน สิทธิโยธี"
    approver_pos = "พัฒนาสังคมและความมั่นคงของมนุษย์จังหวัดกำแพงเพชร"
    approver_date = booking_data.get('approverDate', '')

    # Vehicle Display
    veh_clause = f" {veh_name} " if veh_name and veh_name != "รอฝ่ายบริหารจัดสรร" else ""

    for i, p in enumerate(doc.paragraphs):
        full_text = p.text
        if 'วันที่..' in full_text and 'เดือน...' in full_text:
            set_p_text(p, f"\t                                                           วันที่..{day or '....'}...เดือน...{month or '..........'}....พ.ศ...{year or '........'}....")
        elif 'ข้าพเจ้า.....' in full_text:
            set_p_text(p, f"\t                    ข้าพเจ้า.....{req_name or '...................................................'}.....ตำแหน่ง.....{req_pos or '...................................................'}..............")
        elif 'ขออนุญาตใช้รถยนต์หมายเลขทะเบียน' in full_text:
            set_p_text(p, f"ขออนุญาตใช้รถยนต์{veh_clause}หมายเลขทะเบียน.....{lic_plate or '.....................................'}.....โดยมี.....{driver or '...................................................................'}")
        elif 'เป็นพนักงานขับรถยนต์ไปราชการที่' in full_text:
            set_p_text(p, f"เป็นพนักงานขับรถยนต์ไปราชการที่...{dest or '..................................................................................................................'}")
        elif 'เพื่อ...' in full_text:
            set_p_text(p, f"เพื่อ...{purpose or '..................................................................................................................'}  พร้อมด้วย")
        elif 'นางสาวพิชชาภา' in full_text or ('ปฏิบัติการ......' in full_text and 'เพื่อ...' not in full_text):
            set_p_text(p, f"{passengers or '.....................................................................................................................................................'}......")
        elif 'มีคนนั่ง........' in full_text:
            set_p_text(p, f"มีคนนั่ง........{passenger_count}...........คน   ระยะทางโดยประมาณ.........{distance}.........กิโลเมตร")
        elif 'ในวันที่…....' in full_text:
            set_p_text(p, f"ในวันที่…....{start_date or '.........................'}..........เวลา......{start_time or '............'}...........น.")
        elif 'ถึงวันที่…....' in full_text:
            set_p_text(p, f"ถึงวันที่…....{end_date or '.........................'}...........เวลา…...{end_time or '............'}….…..น.")
        elif 'ขอเบิกน้ำมันเชื้อเพลิง' in full_text:
            fuel_str = f"{fuel_amount} บาท" if fuel_amount else ".........................................บาท"
            set_p_text(p, f"ขอเบิกน้ำมันเชื้อเพลิงและหล่อลื่น  จำนวน…{fuel_str}")
        elif '(..................นางสาวเอมวิกา' in full_text:
            set_p_text(p, f"\t                                                                  (..................{req_name or '.......................................................'}...................)")
        elif 'ตำแหน่ง.......พนักงานคุ้มครองสวัสดิภาพเด็ก' in full_text:
            set_p_text(p, f"\t                                                           ตำแหน่ง.......{req_pos or '.....................................................'}................")
        elif i == 18 or 'หัวหน้ากลุ่ม/ฝ่าย' in full_text:
            # Paragraph 18: ลงชื่อ......................................................หัวหน้ากลุ่ม/ฝ่าย
            pass
        elif i == 19:
            # Paragraph 19: (หัวหน้ากลุ่ม/ฝ่าย)
            if div_reviewer_name:
                set_p_text(p, f"\t                                                                  (..................{div_reviewer_name}...................)")
            else:
                set_p_text(p, "\t                                                                  (.......................................................)")
        elif i == 20:
            # Paragraph 20: ตำแหน่ง หัวหน้ากลุ่ม/ฝ่าย
            if div_reviewer_pos:
                set_p_text(p, f"\t                                                           ตำแหน่ง.......{div_reviewer_pos}................")
            else:
                set_p_text(p, "\t                                                           ตำแหน่ง.....................................................")
        elif 'ความเห็น...........' in full_text or i == 22:
            # Paragraph 22: ความเห็น หน.ฝ่ายบริหาร
            set_p_text(p, f" ความเห็น...........{admin_head_notes or 'เพื่อโปรดพิจารณาอนุญาต'}.........................................................................................................")
        elif i == 24 and 'ลงชื่อ' in full_text:
            # Paragraph 24: ลงชื่อ หน.ฝ่ายบริหารทั่วไป
            set_p_text(p, "\t                                                           \tลงชื่อ..........................................................หัวหน้าฝ่ายบริหารทั่วไป")
        elif i == 25:
            # Paragraph 25: (หน.ฝ่ายบริหารทั่วไป)
            if admin_head_name:
                set_p_text(p, f"\t                                                                  (..................{admin_head_name}...................)")
            else:
                set_p_text(p, "\t                                                                  (.......................................................)")
        elif i == 26:
            # Paragraph 26: ตำแหน่ง หน.ฝ่ายบริหารทั่วไป
            if admin_head_name:
                set_p_text(p, f"\t                                                           ตำแหน่ง.......{admin_head_pos}................")
            else:
                set_p_text(p, "\t                                                           ตำแหน่ง.....................................................")
        elif '(................) อนุญาต' in full_text or i == 28:
            app_mark = '✓' if is_approved else '................'
            rej_mark = '✓' if is_rejected else '................'
            set_p_text(p, f"\t\t                                                            ({app_mark}) อนุญาต   ({rej_mark}) ไม่อนุญาต")
        elif i == 31:
            # Paragraph 31: (ผู้อนุญาต)
            if approver_name:
                set_p_text(p, f"\t                                                                  (..................{approver_name}...................)")
            else:
                set_p_text(p, "\t                                                                  (.......................................................) ")
        elif i == 32:
            # Paragraph 32: วันที่ผู้อนุญาต
            if approver_date:
                set_p_text(p, f"\t                                                           \t    {approver_date}")

    doc.save(output_path)
    return output_path

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python generate_car_booking_docx.py <input_json_file> <output_docx_file>")
        sys.exit(1)
        
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    
    with open(input_file, 'r', encoding='utf-8') as f:
        data = f.read()
        
    generate_booking_docx(data, output_file)
    print(f"Generated {output_file} successfully")
