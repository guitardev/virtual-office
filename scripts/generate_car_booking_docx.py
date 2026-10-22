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
    lic_plate = booking_data.get('licensePlate', '')
    driver = booking_data.get('assignedDriver', '')
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
    manager_name = booking_data.get('managerName', '')
    manager_notes = booking_data.get('managerNotes', 'เพื่อโปรดพิจารณาอนุญาต')
    is_approved = booking_data.get('status') == 'approved'
    is_rejected = booking_data.get('status') == 'rejected'
    approver_name = booking_data.get('approverName', '')

    for p in doc.paragraphs:
        full_text = p.text
        if 'วันที่..' in full_text and 'เดือน...' in full_text:
            p.text = f"\t                                                           วันที่..{day or '....'}...เดือน...{month or '..........'}....พ.ศ...{year or '........'}...."
        elif 'ข้าพเจ้า.....' in full_text:
            p.text = f"\t                    ข้าพเจ้า.....{req_name or '...................................................'}.....ตำแหน่ง.....{req_pos or '...................................................'}.............."
        elif 'ขออนุญาตใช้รถยนต์หมายเลขทะเบียน' in full_text:
            p.text = f"ขออนุญาตใช้รถยนต์หมายเลขทะเบียน.....{lic_plate or '.....................................'}.....โดยมี.....{driver or '...................................................................'}"
        elif 'เป็นพนักงานขับรถยนต์ไปราชการที่' in full_text:
            p.text = f"เป็นพนักงานขับรถยนต์ไปราชการที่...{dest or '..................................................................................................................'}"
        elif 'เพื่อ...' in full_text:
            p.text = f"เพื่อ...{purpose or '..................................................................................................................'}  พร้อมด้วย"
        elif 'นางสาวพิชชาภา' in full_text or ('ปฏิบัติการ......' in full_text and 'เพื่อ...' not in full_text):
            p.text = f"{passengers or '.....................................................................................................................................................'}......"
        elif 'มีคนนั่ง........' in full_text:
            p.text = f"มีคนนั่ง........{passenger_count}...........คน   ระยะทางโดยประมาณ.........{distance}.........กิโลเมตร"
        elif 'ในวันที่…....' in full_text:
            p.text = f"ในวันที่…....{start_date or '.........................'}..........เวลา......{start_time or '............'}...........น."
        elif 'ถึงวันที่…....' in full_text:
            p.text = f"ถึงวันที่…....{end_date or '.........................'}...........เวลา…...{end_time or '............'}….…..น."
        elif 'ขอเบิกน้ำมันเชื้อเพลิง' in full_text:
            fuel_str = f"{fuel_amount} บาท" if fuel_amount else ".........................................บาท"
            p.text = f"ขอเบิกน้ำมันเชื้อเพลิงและหล่อลื่น  จำนวน…{fuel_str}"
        elif '(..................นางสาวเอมวิกา' in full_text:
            p.text = f"\t                                                                  (..................{req_name or '.......................................................'}...................)"
        elif 'ตำแหน่ง.......พนักงานคุ้มครองสวัสดิภาพเด็ก' in full_text:
            p.text = f"\t                                                           ตำแหน่ง.......{req_pos or '.....................................................'}................"
        elif 'ความเห็น...........' in full_text:
            p.text = f" ความเห็น...........{manager_notes or 'เพื่อโปรดพิจารณาอนุญาต'}........................................................................................................."
        elif '(................) อนุญาต' in full_text:
            app_mark = '✓' if is_approved else '................'
            rej_mark = '✓' if is_rejected else '................'
            p.text = f"\t\t                                                            ({app_mark}) อนุญาต   ({rej_mark}) ไม่อนุญาต"
        elif '(.......................................................) ' in full_text and p.text.endswith(' '):
            if approver_name and is_approved:
                p.text = f"\t                                                                  (..................{approver_name}...................) "

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
