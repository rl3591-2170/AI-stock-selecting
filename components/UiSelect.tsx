'use client';
import {Select} from '@base-ui/react/select';
import {ChevronDown} from 'lucide-react';
export default function UiSelect({label,value,options,onValueChange,disabled=false,placeholder='选择'}:{label:string;value:string;options:{value:string;label:string}[];onValueChange:(value:string)=>void;disabled?:boolean;placeholder?:string}){
 return <Select.Root value={value||null} onValueChange={v=>{if(v!==null)onValueChange(v)}} disabled={disabled} items={options}>
  <Select.Trigger className="ui-select" aria-label={label}><Select.Value placeholder={placeholder}/><Select.Icon><ChevronDown/></Select.Icon></Select.Trigger>
  <Select.Portal><Select.Positioner className="select-positioner" sideOffset={6} alignItemWithTrigger={false}><Select.Popup className="select-popup"><Select.List>{options.map((o,i)=><Select.Item key={o.value} value={o.value} label={o.label} className="select-option"><span className="select-dot"><Select.ItemIndicator>●</Select.ItemIndicator></span><span className="select-index">{String(i+1).padStart(2,'0')}</span><Select.ItemText>{o.label}</Select.ItemText></Select.Item>)}</Select.List></Select.Popup></Select.Positioner></Select.Portal>
 </Select.Root>;
}
