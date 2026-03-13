'use client';
import { useState, useEffect } from 'react';
import { Plus, Bus, MapPin, Trash2, Edit } from 'lucide-react';
import { transportApi, studentsApi } from '@/lib/api';
import { Modal, Tabs, Empty, TableSkeleton } from '@/components/ui';
import toast from 'react-hot-toast';

export default function TransportPage() {
  const [tab, setTab] = useState('vehicles');
  return (
    <div className="space-y-5 max-w-7xl">
      <div className="page-header"><div><h1 className="page-title">Transport</h1><p className="page-sub">Manage vehicles, routes and student assignments</p></div></div>
      <Tabs tabs={[{key:'vehicles',label:'Vehicles'},{key:'routes',label:'Routes'},{key:'assignments',label:'Student Assignments'}]} active={tab} onChange={setTab}/>
      {tab==='vehicles'    && <VehiclesTab/>}
      {tab==='routes'      && <RoutesTab/>}
      {tab==='assignments' && <AssignmentsTab/>}
    </div>
  );
}

function VehiclesTab() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showAdd, setShowAdd]   = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const load = () => { setLoading(true); transportApi.getVehicles().then(r=>setVehicles(r.data.data||[])).catch(()=>toast.error('Failed')).finally(()=>setLoading(false)); };
  useEffect(()=>load(),[]);
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><button onClick={()=>setShowAdd(true)} className="btn-primary"><Plus className="w-4 h-4"/>Add Vehicle</button></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? [...Array(3)].map((_,i)=><div key={i} className="h-36 card animate-pulse"/>) : vehicles.length===0 ? <div className="col-span-3"><Empty icon={Bus} title="No vehicles" action={<button onClick={()=>setShowAdd(true)} className="btn-primary"><Plus className="w-4 h-4"/>Add Vehicle</button>}/></div>
        : vehicles.map((v:any)=>(
          <div key={v.id} className="card p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center"><Bus className="w-5 h-5 text-blue-600"/></div>
              <div className="flex-1">
                <p className="font-bold text-slate-800">{v.vehicleNumber}</p>
                <p className="text-sm text-slate-500">{v.vehicleType||'Bus'} · {v.capacity} seats</p>
              </div>
              <div className="flex gap-1">
                <button onClick={()=>setEditItem(v)} className="btn-icon" title="Edit"><Edit className="w-3.5 h-3.5"/></button>
                <span className={`badge ${v.isActive!==false?'badge-green':'badge-red'}`}>{v.isActive!==false?'Active':'Inactive'}</span>
              </div>
            </div>
            {v.driverName && <div className="mt-3 pt-3 border-t border-slate-100 text-sm text-slate-500">Driver: <span className="font-medium text-slate-700">{v.driverName}</span>{v.driverPhone&&` · ${v.driverPhone}`}</div>}
          </div>
        ))}
      </div>
      {showAdd  && <VehicleModal onClose={()=>setShowAdd(false)} onSuccess={()=>{setShowAdd(false);load();}}/>}
      {editItem && <VehicleModal vehicle={editItem} onClose={()=>setEditItem(null)} onSuccess={()=>{setEditItem(null);load();}}/>}
    </div>
  );
}

function RoutesTab() {
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const load = () => { setLoading(true); transportApi.getRoutes().then(r=>setRoutes(r.data.data||[])).catch(()=>toast.error('Failed')).finally(()=>setLoading(false)); };
  useEffect(()=>load(),[]);
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><button onClick={()=>setShowAdd(true)} className="btn-primary"><Plus className="w-4 h-4"/>Add Route</button></div>
      <div className="card overflow-hidden">
        <table className="tbl">
          <thead><tr><th>Route Name</th><th>Stops</th><th>Vehicle</th><th>Distance</th><th>Fee/Month</th><th>Actions</th></tr></thead>
          <tbody>
            {loading ? <TableSkeleton rows={5} cols={6}/> : routes.length===0 ? (
              <tr><td colSpan={6}><Empty icon={MapPin} title="No routes" action={<button onClick={()=>setShowAdd(true)} className="btn-primary"><Plus className="w-4 h-4"/>Add Route</button>}/></td></tr>
            ) : routes.map((r:any)=>(
              <tr key={r.id}>
                <td className="font-medium">{r.name}</td>
                <td>{r.stops?.length||r.busStops?.length||0} stops</td>
                <td>{r.vehicle?.vehicleNumber||'—'}</td>
                <td>{r.distanceKm?`${r.distanceKm} km`:'—'}</td>
                <td>{r.feePerMonth?`₹${r.feePerMonth}`:'—'}</td>
                <td><button onClick={()=>setSelected(r)} className="btn-secondary text-xs py-1.5">View Stops</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showAdd && <RouteModal onClose={()=>setShowAdd(false)} onSuccess={()=>{setShowAdd(false);load();}}/>}
      {selected && <RouteDetail route={selected} onClose={()=>setSelected(null)}/>}
    </div>
  );
}

function AssignmentsTab() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [routes, setRoutes]           = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showAssign, setShowAssign]   = useState(false);
  const load = () => { setLoading(true); transportApi.getAssignments().then(r=>setAssignments(r.data.data||[])).catch(()=>toast.error('Failed')).finally(()=>setLoading(false)); };
  useEffect(()=>{ load(); transportApi.getRoutes().then(r=>setRoutes(r.data.data||[])).catch(()=>{}); },[]);
  const unassign = async (id:string) => {
    try { await transportApi.unassign(id); toast.success('Unassigned'); load(); }
    catch{ toast.error('Failed'); }
  };
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><button onClick={()=>setShowAssign(true)} className="btn-primary"><Plus className="w-4 h-4"/>Assign Student</button></div>
      <div className="card overflow-hidden">
        <table className="tbl">
          <thead><tr><th>Student</th><th>Route</th><th>Stop</th><th>Pickup Time</th><th>Actions</th></tr></thead>
          <tbody>
            {loading ? <TableSkeleton rows={5} cols={5}/> : assignments.length===0 ? (
              <tr><td colSpan={5}><Empty icon={Bus} title="No assignments" sub="Assign students to transport routes"/></td></tr>
            ) : assignments.map((a:any)=>(
              <tr key={a.id}>
                <td><p className="font-medium text-sm">{a.student?.name||'—'}</p><p className="text-xs text-slate-400">{a.student?.admissionNumber}</p></td>
                <td className="text-sm">{a.route?.name||'—'}</td>
                <td className="text-sm">{a.busStop?.name||'—'}</td>
                <td className="text-sm">{a.pickupTime||'—'}</td>
                <td><button onClick={()=>unassign(a.id)} className="btn-secondary text-xs py-1.5 text-red-500">Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showAssign && <AssignModal routes={routes} onClose={()=>setShowAssign(false)} onSuccess={()=>{setShowAssign(false);load();}}/>}
    </div>
  );
}

function VehicleModal({ vehicle, onClose, onSuccess }:any) {
  const editing = !!vehicle;
  const [form, setForm] = useState({vehicleNumber:vehicle?.vehicleNumber||'',vehicleType:vehicle?.vehicleType||'BUS',capacity:vehicle?.capacity||'50',driverName:vehicle?.driverName||'',driverPhone:vehicle?.driverPhone||'',driverLicense:vehicle?.driverLicense||''});
  const [saving, setSaving] = useState(false);
  const f=(k:string,v:string)=>setForm(p=>({...p,[k]:v}));
  const submit = async (e:React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      if(editing) await transportApi.updateVehicle(vehicle.id,{...form,capacity:Number(form.capacity)});
      else await transportApi.addVehicle({...form,capacity:Number(form.capacity)});
      toast.success(editing?'Vehicle updated!':'Vehicle added!'); onSuccess();
    }
    catch(err:any){ toast.error(err.response?.data?.message||'Failed'); } finally{ setSaving(false); }
  };
  return (
    <Modal title={editing?'Edit Vehicle':'Add Vehicle'} onClose={onClose} size="sm">
      <form onSubmit={submit} className="space-y-4">
        <div><label className="form-label">Vehicle Number *</label><input required value={form.vehicleNumber} onChange={e=>f('vehicleNumber',e.target.value)} className="form-input" placeholder="e.g. JH10AB1234"/></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="form-label">Type</label><select value={form.vehicleType} onChange={e=>f('vehicleType',e.target.value)} className="form-select">{['BUS','VAN','AUTO'].map(t=><option key={t} value={t}>{t}</option>)}</select></div>
          <div><label className="form-label">Capacity</label><input type="number" value={form.capacity} onChange={e=>f('capacity',e.target.value)} className="form-input"/></div>
          <div><label className="form-label">Driver Name</label><input value={form.driverName} onChange={e=>f('driverName',e.target.value)} className="form-input"/></div>
          <div><label className="form-label">Driver Phone</label><input value={form.driverPhone} onChange={e=>f('driverPhone',e.target.value)} className="form-input"/></div>
        </div>
        <div><label className="form-label">License Number</label><input value={form.driverLicense} onChange={e=>f('driverLicense',e.target.value)} className="form-input"/></div>
        <div className="flex gap-3"><button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button><button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving?'Saving…':editing?'Update Vehicle':'Add Vehicle'}</button></div>
      </form>
    </Modal>
  );
}

function RouteModal({ onClose, onSuccess }:any) {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [form, setForm] = useState({name:'',vehicleId:'',distanceKm:'',feePerMonth:'',stops:['']});
  const [saving, setSaving] = useState(false);
  useEffect(()=>{ transportApi.getVehicles().then(r=>setVehicles(r.data.data||[])).catch(()=>{}); },[]);
  const f=(k:string,v:any)=>setForm(p=>({...p,[k]:v}));
  const submit = async (e:React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await transportApi.createRoute({name:form.name,vehicleId:form.vehicleId||undefined,distanceKm:form.distanceKm?Number(form.distanceKm):undefined,feePerMonth:form.feePerMonth?Number(form.feePerMonth):undefined,stops:form.stops.filter(Boolean).map((s,i)=>({name:s,order:i+1}))});
      toast.success('Route created!'); onSuccess();
    } catch(err:any){ toast.error(err.response?.data?.message||'Failed'); } finally{ setSaving(false); }
  };
  return (
    <Modal title="Add Route" onClose={onClose} size="md">
      <form onSubmit={submit} className="space-y-4">
        <div><label className="form-label">Route Name *</label><input required value={form.name} onChange={e=>f('name',e.target.value)} className="form-input" placeholder="e.g. Koderma–Hazaribagh"/></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="form-label">Vehicle</label><select value={form.vehicleId} onChange={e=>f('vehicleId',e.target.value)} className="form-select"><option value="">Select</option>{vehicles.map((v:any)=><option key={v.id} value={v.id}>{v.vehicleNumber}</option>)}</select></div>
          <div><label className="form-label">Fee/Month (₹)</label><input type="number" value={form.feePerMonth} onChange={e=>f('feePerMonth',e.target.value)} className="form-input"/></div>
        </div>
        <div>
          <label className="form-label">Bus Stops</label>
          {form.stops.map((s,i)=>(
            <div key={i} className="flex gap-2 mb-2">
              <input value={s} onChange={e=>{const ns=[...form.stops];ns[i]=e.target.value;f('stops',ns);}} className="form-input flex-1" placeholder={`Stop ${i+1}`}/>
              {form.stops.length>1 && <button type="button" onClick={()=>f('stops',form.stops.filter((_,j)=>j!==i))} className="btn-icon text-danger-500">×</button>}
            </div>
          ))}
          <button type="button" onClick={()=>f('stops',[...form.stops,''])} className="btn-ghost text-xs"><Plus className="w-3 h-3"/>Add Stop</button>
        </div>
        <div className="flex gap-3"><button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button><button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving?'Saving…':'Create Route'}</button></div>
      </form>
    </Modal>
  );
}

function RouteDetail({ route, onClose }:any) {
  const stops = route.stops||route.busStops||[];
  return (
    <Modal title={`Route: ${route.name}`} onClose={onClose} size="sm">
      <div className="space-y-3">
        {stops.length===0 ? <p className="text-center py-6 text-slate-400">No stops defined</p> : (
          <div className="space-y-2">
            {stops.map((s:any,i:number)=>(
              <div key={i} className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-primary-600 text-white text-xs flex items-center justify-center font-bold">{i+1}</div>
                <p className="text-sm font-medium text-slate-700">{s.name}</p>
                {s.pickupTime && <span className="text-xs text-slate-400 ml-auto">{s.pickupTime}</span>}
              </div>
            ))}
          </div>
        )}
        <button onClick={onClose} className="btn-secondary w-full justify-center mt-3">Close</button>
      </div>
    </Modal>
  );
}

function AssignModal({ routes, onClose, onSuccess }:any) {
  const [form, setForm] = useState({admissionNumber:'',routeId:'',stopId:'',pickupTime:''});
  const [student, setStudent] = useState<any>(null);
  const [stops, setStops]     = useState<any[]>([]);
  const [finding, setFinding] = useState(false);
  const [saving, setSaving]   = useState(false);
  const f=(k:string,v:string)=>setForm(p=>({...p,[k]:v}));

  const findStudent = async () => {
    if(!form.admissionNumber) return;
    setFinding(true);
    try { const r = await studentsApi.lookup(form.admissionNumber); setStudent(r.data.data); }
    catch{ toast.error('Not found'); setStudent(null); } finally{ setFinding(false); }
  };

  useEffect(()=>{
    if(form.routeId) { transportApi.getRoute(form.routeId).then(r=>setStops(r.data.data?.stops||r.data.data?.busStops||[])).catch(()=>{}); }
  },[form.routeId]);

  const submit = async (e:React.FormEvent) => {
    e.preventDefault(); if(!student) return toast.error('Find student first'); setSaving(true);
    try { await transportApi.assignStudent({studentId:student.id,routeId:form.routeId,busStopId:form.stopId||undefined,pickupTime:form.pickupTime||undefined}); toast.success('Assigned!'); onSuccess(); }
    catch(err:any){ toast.error(err.response?.data?.message||'Failed'); } finally{ setSaving(false); }
  };

  return (
    <Modal title="Assign Student to Transport" onClose={onClose} size="sm">
      <form onSubmit={submit} className="space-y-4">
        <div><label className="form-label">Admission Number</label>
          <div className="flex gap-2"><input value={form.admissionNumber} onChange={e=>f('admissionNumber',e.target.value)} className="form-input flex-1"/><button type="button" onClick={findStudent} className="btn-secondary">{finding?'…':'Find'}</button></div>
          {student && <div className="mt-2 p-2.5 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{student.name}</div>}
        </div>
        <div><label className="form-label">Route *</label><select required value={form.routeId} onChange={e=>f('routeId',e.target.value)} className="form-select"><option value="">Select</option>{routes.map((r:any)=><option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
        {stops.length>0 && <div><label className="form-label">Bus Stop</label><select value={form.stopId} onChange={e=>f('stopId',e.target.value)} className="form-select"><option value="">Select</option>{stops.map((s:any)=><option key={s.id} value={s.id}>{s.name}</option>)}</select></div>}
        <div><label className="form-label">Pickup Time</label><input type="time" value={form.pickupTime} onChange={e=>f('pickupTime',e.target.value)} className="form-input"/></div>
        <div className="flex gap-3"><button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button><button type="submit" disabled={saving||!student} className="btn-primary flex-1 justify-center">{saving?'Assigning…':'Assign'}</button></div>
      </form>
    </Modal>
  );
}
