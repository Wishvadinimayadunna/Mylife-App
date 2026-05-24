import Calendar from "@/components/ui/calendar";
import healthService from "@/services/healthService";
import { useAppStore } from "@/store/appStore";
import { Stack, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert, FlatList, Modal, ScrollView, StyleSheet,
  Switch, Text, TextInput, TouchableOpacity, View,
} from "react-native";

const NAVY = "#1a1f36";
const PINK = "#D4537E";
const BORDER = "#E5E7EB";
const BG = "#F9FAFB";

type Screen = "home"|"mood"|"appointments"|"medication"|"vitals"|"symptoms"|"period";

const FEATURES = [
  { id:"mood",         label:"Mood Tracker",     sub:"Log how you feel today",         icon:"😊", color:"#7C3AED", tint:"#EDE9FE" },
  { id:"appointments", label:"Appointments",     sub:"Manage doctor visits",            icon:"📅", color:"#0D9488", tint:"#E6F4F2" },
  { id:"medication",   label:"Medication",       sub:"Reminders and dosages",           icon:"💊", color:"#E11D48", tint:"#FFE4E6" },
  { id:"vitals",       label:"Vitals Tracker",   sub:"BP, sugar, and weight",           icon:"❤️", color:"#2563EB", tint:"#DBEAFE" },
  { id:"symptoms",     label:"Symptom Log",      sub:"Record symptoms and severity",    icon:"🌡️", color:"#D97706", tint:"#FEF3C7" },
  { id:"period",       label:"Period Tracker",   sub:"Cycle logs and flow",             icon:"🌸", color:"#DB2777", tint:"#FCE7F3", femaleOnly:true },
];

const MOODS = ["Amazing","Good","Neutral","Bad","Terrible"];
const SEVERITIES = ["Mild","Moderate","Severe"];
const FLOWS = ["Light","Medium","Heavy"];

function fmt(d:any){if(!d)return"";return new Date(d).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});}

export default function HealthScreen(){
  const { profile } = useAppStore();
  const router = useRouter();
  const isFemale = profile?.gender==="Female";

  const [screen, setScreen] = useState<Screen>("home");
  const [items, setItems] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [showCal, setShowCal] = useState(false);
  const [calField, setCalField] = useState("");
  const [ptStep, setPtStep] = useState<"idle"|"end">("idle");
  const [ptStart, setPtStart] = useState<Date|null>(null);
  const [ptEnd, setPtEnd] = useState<Date|null>(null);
  const [ptFlow, setPtFlow] = useState("Medium");
  const [showFlowPicker, setShowFlowPicker] = useState(false);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());

  const load = useCallback(async()=>{
    if(screen==="home") return;
    try{
      let data:any[]=[];
      if(screen==="mood")         data=await healthService.getMoods();
      if(screen==="appointments") data=await healthService.getAppointments();
      if(screen==="medication")   data=await healthService.getMedicineReminders();
      if(screen==="vitals")       data=await healthService.getHealthRecords();
      if(screen==="symptoms")     data=await healthService.getSymptoms();
      if(screen==="period")       data=await healthService.getPeriods();
      setItems(data);
    }catch(e){console.error(e);}
  },[screen]);

  useEffect(()=>{load();},[load]);

  const openAdd=()=>{
    setEditing(null);
    const defaults:any={};
    if(screen==="mood")        {defaults.mood="Good";defaults.notes="";}
    if(screen==="appointments"){defaults.doctorName="";defaults.appointmentDate="";defaults.appointmentTime="";defaults.notes="";defaults.reminderEnabled=true;}
    if(screen==="medication")  {defaults.medicineName="";defaults.dosage="";defaults.reminderTime="";defaults.isEnabled=true;}
    if(screen==="vitals")      {defaults.bloodPressureSystolic="";defaults.bloodPressureDiastolic="";defaults.bloodSugar="";defaults.weight="";defaults.bmi="";defaults.recordDate="";defaults.notes="";}
    if(screen==="symptoms")    {defaults.symptomName="";defaults.severity="Mild";defaults.notes="";defaults.recordDate="";}
    if(screen==="period")      {defaults.startDate="";defaults.endDate="";defaults.flow="Medium";defaults.notes="";}
    setForm(defaults);
    setShowModal(true);
  };

  const openEdit=(item:any)=>{
    setEditing(item);
    const f:any={...item};
    if(f.appointmentDate) f.appointmentDate=new Date(f.appointmentDate).toISOString().split("T")[0];
    if(f.recordDate)      f.recordDate=new Date(f.recordDate).toISOString().split("T")[0];
    if(f.startDate)       f.startDate=new Date(f.startDate).toISOString().split("T")[0];
    if(f.endDate)         f.endDate=new Date(f.endDate).toISOString().split("T")[0];
    setForm(f);
    setShowModal(true);
  };

  const save=async()=>{
    const id=editing?.id||editing?._id;
    try{
      if(screen==="mood"){
        const d={mood:form.mood,notes:form.notes,recordDate:new Date()};
        id?await healthService.updateMood(id,d):await healthService.addMood(d);
      }else if(screen==="appointments"){
        const d={...form,appointmentDate:new Date(form.appointmentDate)};
        id?await healthService.updateAppointment(id,d):await healthService.addAppointment(d);
      }else if(screen==="medication"){
        id?await healthService.updateMedicineReminder(id,form):await healthService.addMedicineReminder(form);
      }else if(screen==="vitals"){
        const d={...form,
          bloodPressureSystolic:form.bloodPressureSystolic?Number(form.bloodPressureSystolic):undefined,
          bloodPressureDiastolic:form.bloodPressureDiastolic?Number(form.bloodPressureDiastolic):undefined,
          bloodSugar:form.bloodSugar?Number(form.bloodSugar):undefined,
          weight:form.weight?Number(form.weight):undefined,
          bmi:form.bmi?Number(form.bmi):undefined,
          recordDate:new Date(form.recordDate||new Date()),
        };
        id?await healthService.updateHealthRecord(id,d):await healthService.addHealthRecord(d);
      }else if(screen==="symptoms"){
        const d={...form,recordDate:new Date(form.recordDate||new Date())};
        id?await healthService.updateSymptom(id,d):await healthService.addSymptom(d);
      }else if(screen==="period"){
        const d={...form,startDate:new Date(form.startDate),endDate:form.endDate?new Date(form.endDate):undefined};
        id?await healthService.updatePeriod(id,d):await healthService.addPeriod(d);
      }
      setShowModal(false);
      load();
    }catch(e){Alert.alert("Error","Failed to save. Try again.");}
  };

  const del=(item:any)=>{
    Alert.alert("Delete","Are you sure?",[
      {text:"Cancel",style:"cancel"},
      {text:"Delete",style:"destructive",onPress:async()=>{
        const id=item.id||item._id;
        if(screen==="mood")         await healthService.deleteMood(id);
        if(screen==="appointments") await healthService.deleteAppointment(id);
        if(screen==="medication")   await healthService.deleteMedicineReminder(id);
        if(screen==="vitals")       await healthService.deleteHealthRecord(id);
        if(screen==="symptoms")     await healthService.deleteSymptom(id);
        if(screen==="period")       await healthService.deletePeriod(id);
        load();
      }},
    ]);
  };

  const feat = FEATURES.filter(f=>!f.femaleOnly||isFemale);
  const activeFeat = FEATURES.find(f=>f.id===screen);

  const savePeriodCal=async()=>{
    if(!ptStart)return;
    try{
      await healthService.addPeriod({startDate:ptStart,endDate:ptEnd||undefined,flow:ptFlow,notes:""});
      setShowFlowPicker(false);setPtStep("idle");setPtStart(null);setPtEnd(null);setPtFlow("Medium");load();
    }catch(e){Alert.alert("Error","Failed to save period.");}
  };

  // Period Tracker: header subtitle — shows avg cycle if available
  const getPeriodSubtitle = () => {
    const sorted = [...items].sort((a,b)=>new Date(b.startDate).getTime()-new Date(a.startDate).getTime());
    
    // Group logs into unique cycles (must be at least 15 days apart)
    const uniqueCycles: any[] = [];
    sorted.forEach((record) => {
      const date = new Date(record.startDate);
      const isClose = uniqueCycles.some((c) => {
        const diffDays = Math.abs((new Date(c.startDate).getTime() - date.getTime()) / 864e5);
        return diffDays < 15;
      });
      if (!isClose) {
        uniqueCycles.push(record);
      }
    });

    const monthYear = new Date().toLocaleDateString("en-US",{month:"long",year:"numeric"});
    
    if (uniqueCycles.length >= 2) {
      const diffs = uniqueCycles.slice(0, -1).map((_: any, i: number) => 
        Math.round((new Date(uniqueCycles[i].startDate).getTime() - new Date(uniqueCycles[i+1].startDate).getTime()) / 864e5)
      );
      const validDiffs = diffs.filter(d => d > 0);
      if (validDiffs.length > 0) {
        const avg = Math.round(validDiffs.reduce((a: number, b: number) => a + b, 0) / validDiffs.length);
        return `${monthYear} · Avg cycle ${avg} days`;
      }
    }
    if (uniqueCycles.length === 1) {
      const cycleDay = Math.round((Date.now() - new Date(uniqueCycles[0].startDate).getTime()) / (864e5)) + 1;
      return `${monthYear} · Cycle day ${cycleDay}`;
    }
    return `${monthYear} · No cycles logged yet`;
  };

  // Period Tracker: full custom screen
  const renderPeriodScreen = () => {
    const today = new Date();
    const year = calYear, month = calMonth;
    const sorted = [...items].sort((a,b)=>new Date(b.startDate).getTime()-new Date(a.startDate).getTime());
    
    // Group logs into unique cycles (must be at least 15 days apart)
    const uniqueCycles: any[] = [];
    sorted.forEach((record) => {
      const date = new Date(record.startDate);
      const isClose = uniqueCycles.some((c) => {
        const diffDays = Math.abs((new Date(c.startDate).getTime() - date.getTime()) / 864e5);
        return diffDays < 15;
      });
      if (!isClose) {
        uniqueCycles.push(record);
      }
    });

    let avgCycle = 28; // Standard fallback
    let isCalculated = false;
    if (uniqueCycles.length >= 2) {
      const diffs = uniqueCycles.slice(0, -1).map((_: any, i: number) => 
        Math.round((new Date(uniqueCycles[i].startDate).getTime() - new Date(uniqueCycles[i+1].startDate).getTime()) / 864e5)
      );
      const validDiffs = diffs.filter(d => d > 0);
      if (validDiffs.length > 0) {
        avgCycle = Math.round(validDiffs.reduce((a: number, b: number) => a + b, 0) / validDiffs.length);
        isCalculated = true;
      }
    }

    let daysUntilNext: number | string | null = null;
    if (uniqueCycles.length > 0) {
      const nextDate = new Date(new Date(uniqueCycles[0].startDate).getTime() + avgCycle * 864e5);
      const diff = Math.round((nextDate.getTime() - today.getTime()) / 864e5);
      if (diff === 0) {
        daysUntilNext = "Today";
      } else if (diff < 0) {
        // Period is overdue
        daysUntilNext = `Overdue`;
      } else {
        daysUntilNext = diff;
      }
    }

    const periodDays = new Set<number>(), predictedDays = new Set<number>(), fertileDays = new Set<number>();
    items.forEach((p: any) => {
      const s2 = new Date(p.startDate);
      const e2 = p.endDate ? new Date(p.endDate) : new Date(s2.getTime() + 5 * 864e5);
      for (let d = new Date(s2); d <= e2; d.setDate(d.getDate() + 1))
        if (d.getFullYear() === year && d.getMonth() === month) periodDays.add(d.getDate());
    });

    if (uniqueCycles.length > 0) {
      const lastStart = new Date(uniqueCycles[0].startDate);
      const nextStart = new Date(lastStart.getTime() + avgCycle * 864e5);
      for (let d = new Date(nextStart); d <= new Date(nextStart.getTime() + 5 * 864e5); d.setDate(d.getDate() + 1))
        if (d.getFullYear() === year && d.getMonth() === month) predictedDays.add(d.getDate());
      for (let d = new Date(lastStart.getTime() + 10 * 864e5); d <= new Date(lastStart.getTime() + 15 * 864e5); d.setDate(d.getDate() + 1))
        if (d.getFullYear() === year && d.getMonth() === month) fertileDays.add(d.getDate());
    }

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
    const getCellStyle = (day: number) => {
      const dayDate = new Date(year, month, day);
      if (ptStart && ptEnd) {
        if (dayDate >= ptStart && dayDate <= ptEnd) return { bg: "#FBEAF0", text: "#72243E" };
      }
      if (ptStart && day === ptStart.getDate() && month === ptStart.getMonth() && year === ptStart.getFullYear()) return { bg: PINK, text: "#fff" };
      if (ptEnd && day === ptEnd.getDate() && month === ptEnd.getMonth() && year === ptEnd.getFullYear()) return { bg: PINK, text: "#fff" };
      if (ptStart && !ptEnd && day === ptStart.getDate() && month === ptStart.getMonth() && year === ptStart.getFullYear()) return { bg: PINK, text: "#fff" };
      if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) return { bg: NAVY, text: "#fff" };
      if (periodDays.has(day)) return { bg: "#FBEAF0", text: "#72243E" };
      if (predictedDays.has(day)) return { bg: "#F4C0D1", text: "#72243E" };
      if (fertileDays.has(day)) return { bg: "#EAF3DE", text: "#27500A" };
      return { bg: "transparent", text: "#1F2937" };
    };
    const latest = sorted[0];
    return (
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 90 }}>
        {/* Stat Chips */}
        <View style={ps.chipRow}>
          <View style={ps.chip}>
            <Text style={ps.chipNum}>{uniqueCycles.length >= 2 ? avgCycle : "—"}</Text>
            <Text style={ps.chipLabel}>Avg cycle days</Text>
            <Text style={ps.chipHint}>
              {isCalculated ? "Calculated" : "Log 2+ cycles"}
            </Text>
          </View>
          <View style={ps.chip}>
            <Text style={[ps.chipNum, { color: daysUntilNext !== null ? PINK : "#D1D5DB" }]}>
              {daysUntilNext !== null ? daysUntilNext : "—"}
            </Text>
            <Text style={ps.chipLabel}>Days until next</Text>
            <Text style={ps.chipHint}>
              {daysUntilNext !== null ? (isCalculated ? "Prediction" : "Using 28d default") : "Log a cycle"}
            </Text>
          </View>
        </View>
        {/* Legend */}
        <View style={ps.legendRow}>
          <View style={ps.legendItem}><View style={[ps.dot,{backgroundColor:PINK}]}/><Text style={ps.legendTxt}>Period</Text></View>
          <View style={ps.legendItem}><View style={[ps.dot,{backgroundColor:"#F4C0D1"}]}/><Text style={ps.legendTxt}>Predicted</Text></View>
          <View style={ps.legendItem}><View style={[ps.dot,{backgroundColor:"#EAF3DE",borderWidth:0.5,borderColor:"#27500A"}]}/><Text style={ps.legendTxt}>Fertile</Text></View>
          <View style={ps.legendItem}><View style={[ps.dot,{backgroundColor:NAVY}]}/><Text style={ps.legendTxt}>Today</Text></View>
        </View>
        {/* Calendar */}
        <View style={ps.calBox}>
        <View style={ps.calNavRow}>
          <TouchableOpacity style={ps.calNavBtn} onPress={()=>{
            if(calMonth===0){setCalMonth(11);setCalYear(calYear-1);}
            else{setCalMonth(calMonth-1);}
          }}><Text style={ps.calNavArrow}>‹</Text></TouchableOpacity>
          <Text style={ps.calMonth}>{new Date(calYear,calMonth,1).toLocaleDateString("en-US",{month:"long",year:"numeric"})}</Text>
          <TouchableOpacity style={ps.calNavBtn} onPress={()=>{
            if(calMonth===11){setCalMonth(0);setCalYear(calYear+1);}
            else{setCalMonth(calMonth+1);}
          }}><Text style={ps.calNavArrow}>›</Text></TouchableOpacity>
        </View>
          <View style={ps.calGrid}>
            {["S","M","T","W","T","F","S"].map((d,i)=><Text key={i} style={ps.dayLbl}>{d}</Text>)}
            {cells.map((day,i)=>{
              if(!day) return <View key={`e${i}`} style={ps.cell}/>;
              const {bg,text}=getCellStyle(day);
              const onTap=()=>{
                const tapped=new Date(year,month,day);
                if(ptStep==="idle"){setPtStart(tapped);setPtStep("end");}
                else{const s2=ptStart!,e2=tapped;setPtStart(s2<=e2?s2:e2);setPtEnd(s2<=e2?e2:s2);setShowFlowPicker(true);}
              };
              return(
                <TouchableOpacity key={day} style={ps.cell} onPress={onTap}>
                  <View style={[ps.circle,{backgroundColor:bg}]}>
                    <Text style={[ps.dayNum,{color:text}]}>{day}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
        {ptStep==="end"&&ptStart&&(
          <View style={ps.calHint}>
            <Text style={ps.calHintTxt}>📍 {ptStart.toLocaleDateString("en-US",{month:"short",day:"numeric"})} selected — tap end date</Text>
            <TouchableOpacity onPress={()=>{setPtStep("idle");setPtStart(null);}}><Text style={{color:PINK,fontSize:12,fontWeight:"600"}}>Cancel</Text></TouchableOpacity>
          </View>
        )}
        {/* Action rows */}
        <View style={ps.actionBox}>
          <View style={ps.actionRow}>
            <Text style={ps.actionIcon}>💧</Text>
            <Text style={ps.actionLbl}>Flow intensity</Text>
            <Text style={ps.actionVal}>{latest?.flow||"—"}</Text>
          </View>
          <View style={ps.divider}/>
          <View style={ps.actionRow}>
            <Text style={ps.actionIcon}>😊</Text>
            <Text style={ps.actionLbl}>Mood today</Text>
            <Text style={ps.actionVal}>{latest?.notes||"—"}</Text>
          </View>
        </View>
        <View style={{padding:12,alignItems:"center"}}>
          <Text style={{fontSize:12,color:"#9CA3AF"}}>🌸 Tap a day on the calendar to log your period</Text>
        </View>
      </ScrollView>
    );
  };

  const renderCard=(item:any)=>{
    let title="", sub="";
    if(screen==="mood")         {title=item.mood; sub=fmt(item.recordDate);}
    if(screen==="appointments") {title=item.doctorName; sub=`${fmt(item.appointmentDate)} • ${item.appointmentTime}`;}
    if(screen==="medication")   {title=item.medicineName; sub=`${item.dosage||""} • ${item.reminderTime}`;}
    if(screen==="vitals")       {title=fmt(item.recordDate); sub=[item.bloodPressureSystolic&&`BP ${item.bloodPressureSystolic}/${item.bloodPressureDiastolic}`,item.weight&&`${item.weight}kg`,item.bmi&&`BMI ${item.bmi}`].filter(Boolean).join(" • ");}
    if(screen==="symptoms")     {title=item.symptomName; sub=`${item.severity} • ${fmt(item.recordDate)}`;}
    if(screen==="period")       {title=`From ${fmt(item.startDate)}`; sub=`Flow: ${item.flow}${item.endDate?` • Until ${fmt(item.endDate)}`:""}`;}
    const color=activeFeat?.color||NAVY;
    const tint=activeFeat?.tint||"#F3F4F6";
    return(
      <View style={s.card} key={item.id||item._id}>
        <View style={[s.cardIcon,{backgroundColor:tint}]}><Text style={{fontSize:18}}>{activeFeat?.icon}</Text></View>
        <View style={s.cardBody}>
          <Text style={s.cardTitle}>{title}</Text>
          <Text style={s.cardSub}>{sub}</Text>
        </View>
        <TouchableOpacity onPress={()=>openEdit(item)} style={s.actionBtn}><Text style={{fontSize:13}}>✏️</Text></TouchableOpacity>
        <TouchableOpacity onPress={()=>del(item)} style={s.actionBtn}><Text style={{fontSize:13}}>🗑️</Text></TouchableOpacity>
      </View>
    );
  };

  const renderFormField=(label:string,key:string,opts?:any)=>(
    <View key={key} style={{marginBottom:14}}>
      <Text style={s.formLabel}>{label}</Text>
      {opts?.isDate?(
        <TouchableOpacity style={s.input} onPress={()=>{setCalField(key);setShowCal(true);}}>
          <Text style={{color:form[key]?"#1F2937":"#9CA3AF",fontSize:13}}>{form[key]||"Select date"}</Text>
        </TouchableOpacity>
      ):opts?.options?(
        <View style={{flexDirection:"row",flexWrap:"wrap",gap:8}}>
          {opts.options.map((o:string)=>(
            <TouchableOpacity key={o} onPress={()=>setForm({...form,[key]:o})}
              style={[s.optBtn,form[key]===o&&{backgroundColor:activeFeat?.tint,borderColor:activeFeat?.color}]}>
              <Text style={[s.optBtnText,form[key]===o&&{color:activeFeat?.color,fontWeight:"700"}]}>{o}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ):opts?.isSwitch?(
        <View style={{flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingVertical:4}}>
          <Text style={{fontSize:13,color:"#4B5563"}}>{opts.switchLabel||""}</Text>
          <Switch value={!!form[key]} onValueChange={v=>setForm({...form,[key]:v})}
            trackColor={{false:"#D1D5DB",true:"#A7F3D0"}} thumbColor={form[key]?"#0D9488":"#F3F4F6"}/>
        </View>
      ):(
        <TextInput style={s.input} value={form[key]?.toString()||""} onChangeText={t=>setForm({...form,[key]:t})}
          placeholder={opts?.placeholder||""} placeholderTextColor="#9CA3AF"
          keyboardType={opts?.numeric?"numeric":"default"} multiline={opts?.multi}
          numberOfLines={opts?.multi?3:1} textAlignVertical={opts?.multi?"top":"auto"}/>
      )}
    </View>
  );

  const renderFormContent=()=>{
    if(screen==="mood") return(<>
      {renderFormField("How are you feeling?","mood",{options:MOODS})}
      {renderFormField("Notes (optional)","notes",{placeholder:"Any additional thoughts...",multi:true})}
    </>);
    if(screen==="appointments") return(<>
      {renderFormField("Doctor Name","doctorName",{placeholder:"Dr. Smith"})}
      {renderFormField("Date","appointmentDate",{isDate:true})}
      {renderFormField("Time","appointmentTime",{placeholder:"10:00 AM"})}
      {renderFormField("Notes","notes",{placeholder:"Notes...",multi:true})}
      {renderFormField("","reminderEnabled",{isSwitch:true,switchLabel:"Enable Reminder"})}
    </>);
    if(screen==="medication") return(<>
      {renderFormField("Medicine Name","medicineName",{placeholder:"Aspirin"})}
      {renderFormField("Dosage","dosage",{placeholder:"100mg"})}
      {renderFormField("Reminder Time","reminderTime",{placeholder:"08:00 AM"})}
      {renderFormField("","isEnabled",{isSwitch:true,switchLabel:"Enable Reminder"})}
    </>);
    if(screen==="vitals") return(<>
      {renderFormField("Date","recordDate",{isDate:true})}
      {renderFormField("BP Systolic","bloodPressureSystolic",{placeholder:"120",numeric:true})}
      {renderFormField("BP Diastolic","bloodPressureDiastolic",{placeholder:"80",numeric:true})}
      {renderFormField("Blood Sugar (mg/dL)","bloodSugar",{placeholder:"100",numeric:true})}
      {renderFormField("Weight (kg)","weight",{placeholder:"70",numeric:true})}
      {renderFormField("BMI","bmi",{placeholder:"22.5",numeric:true})}
      {renderFormField("Notes","notes",{placeholder:"Notes...",multi:true})}
    </>);
    if(screen==="symptoms") return(<>
      {renderFormField("Symptom Name","symptomName",{placeholder:"Headache"})}
      {renderFormField("Severity","severity",{options:SEVERITIES})}
      {renderFormField("Date","recordDate",{isDate:true})}
      {renderFormField("Notes","notes",{placeholder:"Notes...",multi:true})}
    </>);
    if(screen==="period") return(<>
      {renderFormField("Start Date","startDate",{isDate:true})}
      {renderFormField("End Date (optional)","endDate",{isDate:true})}
      {renderFormField("Flow","flow",{options:FLOWS})}
      {renderFormField("Notes","notes",{placeholder:"Notes...",multi:true})}
    </>);
    return null;
  };

  return(
    <>
      <Stack.Screen options={{headerShown:false}}/>
      <View style={s.header}>
        <TouchableOpacity style={s.back} onPress={screen!=="home"?()=>setScreen("home"):()=>router.back()}>
          <Text style={s.backTxt}>←</Text>
        </TouchableOpacity>
        <View style={{flex:1}}>
          <Text style={s.headerTitle}>{screen==="home"?"Health Centre":activeFeat?.label}</Text>
          <Text style={s.headerSub}>{screen==="home"?"Your personal health dashboard":screen==="period"?getPeriodSubtitle():activeFeat?.sub}</Text>
        </View>
      </View>

      <View style={s.container}>
        {screen==="home"?(
          <ScrollView contentContainerStyle={{padding:16,gap:12}}>
            <Text style={s.sectionLabel}>HEALTH FEATURES</Text>
            {feat.map(f=>(
              <TouchableOpacity key={f.id} style={s.featureCard} onPress={()=>{setScreen(f.id as Screen);}}>
                <View style={[s.featureIcon,{backgroundColor:f.tint}]}>
                  <Text style={{fontSize:22}}>{f.icon}</Text>
                </View>
                <View style={{flex:1,marginLeft:14}}>
                  <Text style={s.featureTitle}>{f.label}</Text>
                  <Text style={s.featureSub}>{f.sub}</Text>
                </View>
                <Text style={{fontSize:16,color:"#9CA3AF"}}>›</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ):(
          <>
            {screen==="period"?renderPeriodScreen():(
              <>
                <FlatList
                  data={items}
                  keyExtractor={item=>item.id||item._id}
                  contentContainerStyle={{padding:16,paddingBottom:90}}
                  ListEmptyComponent={
                    <View style={s.empty}>
                      <Text style={{fontSize:48,marginBottom:12}}>{activeFeat?.icon}</Text>
                      <Text style={s.emptyTxt}>No {activeFeat?.label} records yet</Text>
                    </View>
                  }
                  renderItem={({item})=>renderCard(item)}
                />
                <View style={s.footer}>
                  <TouchableOpacity style={s.addBtn} onPress={openAdd}>
                    <Text style={s.addBtnTxt}>＋ Add {activeFeat?.label}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </>
        )}
      </View>

      <Modal visible={showModal} animationType="slide" onRequestClose={()=>setShowModal(false)}>
        <View style={s.modalWrap}>
          <View style={[s.modalHeader,{backgroundColor:NAVY}]}>
            <Text style={s.modalHeaderTxt}>{editing?"Edit":"Add"} {activeFeat?.label}</Text>
            <TouchableOpacity onPress={()=>setShowModal(false)}><Text style={{color:"#fff",fontSize:20}}>✕</Text></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{padding:20,paddingBottom:40}}>{renderFormContent()}</ScrollView>
          <View style={s.modalFooter}>
            <TouchableOpacity style={s.cancelBtn} onPress={()=>setShowModal(false)}>
              <Text style={s.cancelBtnTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.saveBtn,{backgroundColor:activeFeat?.color||NAVY}]} onPress={save}>
              <Text style={s.saveBtnTxt}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Calendar visible={showCal} onClose={()=>setShowCal(false)}
          onSelectDate={d=>{setForm((p:any)=>({...p,[calField]:d.toISOString().split("T")[0]}));setShowCal(false);}}
          selectedDate={form[calField]?new Date(form[calField]):undefined}/>
      </Modal>
      <Modal visible={showFlowPicker} animationType="slide" transparent onRequestClose={()=>{setShowFlowPicker(false);setPtStep("idle");setPtStart(null);setPtEnd(null);}}>
        <View style={ps.flowOverlay}>
          <View style={ps.flowBox}>
            <Text style={ps.flowTitle}>Log Period</Text>
            <Text style={ps.flowSub}>{ptStart?fmt(ptStart):""}{ptEnd&&ptEnd.getTime()!==ptStart?.getTime()?` → ${fmt(ptEnd)}`:""}</Text>
            <Text style={ps.flowLabel}>Flow intensity</Text>
            <View style={{flexDirection:"row",gap:10,marginBottom:24}}>
              {FLOWS.map(f=>(
                <TouchableOpacity key={f} onPress={()=>setPtFlow(f)} style={[ps.flowBtn,ptFlow===f&&{backgroundColor:PINK,borderColor:PINK}]}>
                  <Text style={[ps.flowBtnTxt,ptFlow===f&&{color:"#fff"}]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={[s.addBtn,{backgroundColor:PINK}]} onPress={savePeriodCal}>
              <Text style={s.addBtnTxt}>Save Period</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={()=>{setShowFlowPicker(false);setPtStep("idle");setPtStart(null);setPtEnd(null);}} style={{marginTop:12,alignItems:"center"}}>
              <Text style={{color:"#6B7280",fontSize:13}}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  header:{backgroundColor:NAVY,paddingTop:50,paddingBottom:20,paddingHorizontal:20,flexDirection:"row",alignItems:"center"},
  back:{marginRight:14,padding:4},
  backTxt:{color:"#fff",fontSize:22,fontWeight:"bold"},
  headerTitle:{color:"#fff",fontSize:18,fontWeight:"700"},
  headerSub:{color:"#A5B4FC",fontSize:11,marginTop:2},
  container:{flex:1,backgroundColor:BG},
  sectionLabel:{fontSize:12,fontWeight:"700",color:"#6B7280",letterSpacing:0.5,marginBottom:4,textTransform:"uppercase"},
  featureCard:{backgroundColor:"#fff",borderWidth:0.5,borderColor:BORDER,borderRadius:12,padding:14,flexDirection:"row",alignItems:"center"},
  featureIcon:{width:44,height:44,borderRadius:10,justifyContent:"center",alignItems:"center"},
  featureTitle:{fontSize:16,fontWeight:"600",color:"#1F2937"},
  featureSub:{fontSize:13,color:"#9CA3AF",marginTop:2},
  card:{backgroundColor:"#fff",borderWidth:0.5,borderColor:BORDER,borderRadius:12,padding:12,flexDirection:"row",alignItems:"center",marginBottom:10},
  cardIcon:{width:36,height:36,borderRadius:8,justifyContent:"center",alignItems:"center",marginRight:12},
  cardBody:{flex:1},
  cardTitle:{fontSize:13,fontWeight:"500",color:"#1F2937"},
  cardSub:{fontSize:11,color:"#9CA3AF",marginTop:2},
  actionBtn:{padding:8},
  footer:{position:"absolute",bottom:0,left:0,right:0,padding:16,backgroundColor:"#fff",borderTopWidth:0.5,borderTopColor:BORDER},
  addBtn:{backgroundColor:NAVY,borderRadius:10,paddingVertical:14,alignItems:"center"},
  addBtnTxt:{color:"#fff",fontSize:14,fontWeight:"700"},
  empty:{alignItems:"center",paddingVertical:80},
  emptyTxt:{fontSize:14,color:"#9CA3AF"},
  modalWrap:{flex:1,backgroundColor:"#fff"},
  modalHeader:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",padding:20,paddingTop:50},
  modalHeaderTxt:{color:"#fff",fontSize:16,fontWeight:"700"},
  modalFooter:{flexDirection:"row",padding:16,gap:12,borderTopWidth:0.5,borderTopColor:BORDER},
  cancelBtn:{flex:1,borderWidth:1,borderColor:BORDER,borderRadius:10,paddingVertical:13,alignItems:"center"},
  cancelBtnTxt:{fontSize:13,fontWeight:"600",color:"#6B7280"},
  saveBtn:{flex:1,borderRadius:10,paddingVertical:13,alignItems:"center"},
  saveBtnTxt:{color:"#fff",fontSize:13,fontWeight:"700"},
  formLabel:{fontSize:10,fontWeight:"700",color:"#4B5563",letterSpacing:0.5,textTransform:"uppercase",marginBottom:8},
  input:{backgroundColor:"#F9FAFB",borderWidth:0.5,borderColor:BORDER,borderRadius:10,padding:13,fontSize:13,color:"#1F2937",minHeight:44},
  optBtn:{borderWidth:0.5,borderColor:BORDER,borderRadius:20,paddingVertical:7,paddingHorizontal:14,backgroundColor:"#F9FAFB"},
  optBtnText:{fontSize:12,color:"#4B5563"},
});

const ps = StyleSheet.create({
  chipRow:{flexDirection:"row",gap:12,marginBottom:16},
  chip:{flex:1,backgroundColor:"#fff",borderWidth:0.5,borderColor:BORDER,borderRadius:12,padding:16,alignItems:"center"},
  chipNum:{fontSize:36,fontWeight:"700",color:"#1F2937"},
  chipLabel:{fontSize:12,color:"#9CA3AF",marginTop:4,textAlign:"center"},
  chipHint:{fontSize:10,color:"#D97706",marginTop:3,textAlign:"center"},
  legendRow:{flexDirection:"row",gap:14,marginBottom:16,flexWrap:"wrap"},
  legendItem:{flexDirection:"row",alignItems:"center",gap:6},
  dot:{width:10,height:10,borderRadius:5},
  legendTxt:{fontSize:11,color:"#4B5563"},
  calBox:{backgroundColor:"#fff",borderWidth:0.5,borderColor:BORDER,borderRadius:12,padding:16,marginBottom:16},
  calNavRow:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:12},
  calNavBtn:{width:32,height:32,borderRadius:8,backgroundColor:"#F3F4F6",alignItems:"center",justifyContent:"center"},
  calNavArrow:{fontSize:20,color:NAVY,fontWeight:"700",lineHeight:24},
  calMonth:{fontSize:14,fontWeight:"600",color:"#1F2937",flex:1,textAlign:"center"},
  calGrid:{flexDirection:"row",flexWrap:"wrap"},
  dayLbl:{width:"14.28%",textAlign:"center",fontSize:11,fontWeight:"700",color:"#9CA3AF",marginBottom:8},
  cell:{width:"14.28%",alignItems:"center",marginBottom:4},
  circle:{width:30,height:30,borderRadius:15,justifyContent:"center",alignItems:"center"},
  dayNum:{fontSize:13,fontWeight:"500"},
  actionBox:{backgroundColor:"#fff",borderWidth:0.5,borderColor:BORDER,borderRadius:12,overflow:"hidden",marginBottom:16},
  actionRow:{flexDirection:"row",alignItems:"center",padding:16,gap:12},
  actionIcon:{fontSize:18,width:28},
  actionLbl:{flex:1,fontSize:14,color:"#1F2937"},
  actionChev:{fontSize:20,color:"#9CA3AF"},
  actionVal:{fontSize:13,color:PINK,fontWeight:"600"},
  divider:{height:0.5,backgroundColor:BORDER,marginLeft:56},
  calHint:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",backgroundColor:"#FEF0F5",borderWidth:0.5,borderColor:PINK,borderRadius:8,padding:12,marginTop:10,marginBottom:8},
  calHintTxt:{fontSize:12,color:"#72243E",flex:1,marginRight:8},
  flowOverlay:{flex:1,backgroundColor:"rgba(0,0,0,0.5)",justifyContent:"flex-end"},
  flowBox:{backgroundColor:"#fff",borderTopLeftRadius:20,borderTopRightRadius:20,padding:24,paddingBottom:44},
  flowTitle:{fontSize:20,fontWeight:"700",color:"#1F2937",marginBottom:4},
  flowSub:{fontSize:13,color:"#9CA3AF",marginBottom:20},
  flowLabel:{fontSize:11,fontWeight:"700",color:"#4B5563",letterSpacing:0.5,textTransform:"uppercase",marginBottom:10},
  flowBtn:{flex:1,borderWidth:1,borderColor:BORDER,borderRadius:8,paddingVertical:12,alignItems:"center"},
  flowBtnTxt:{fontSize:13,fontWeight:"600",color:"#4B5563"},
});
