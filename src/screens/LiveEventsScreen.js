import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { backendFetch } from '../services/backendClient';
import { getCurrentUser } from '../services/api';
import { useTheme } from '../theme/ThemeContext';
import { hexToRgba } from '../utils/color';
import { showAppAlert } from '../utils/appDialogs';
import GlassCard from '../components/GlassCard';

const CATEGORIES = [
  ['social','Social'],['entertainment','Entertainment'],['education','Education'],
  ['technology','Technology'],['sports','Sports'],['business','Business'],
  ['science','Science'],['finance','Finance'],['health','Health'],['other','Other'],
];
const VISIBILITIES = [
  ['public','Public','globe-outline'],['followers','Followers','people-outline'],['private','Invite only','lock-closed-outline'],
];
const pad = (value) => String(value).padStart(2,'0');
function initialSchedule() {
  const date = new Date(Date.now()+60*60*1000);
  date.setMinutes(Math.ceil(date.getMinutes()/5)*5,0,0);
  return { date: date.getFullYear()+'-'+pad(date.getMonth()+1)+'-'+pad(date.getDate()), time: pad(date.getHours())+':'+pad(date.getMinutes()) };
}
function toIso(dateText,timeText) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateText.trim());
  const clock = /^(\d{2}):(\d{2})$/.exec(timeText.trim());
  if (!match || !clock) return null;
  const date = new Date(Number(match[1]),Number(match[2])-1,Number(match[3]),Number(clock[1]),Number(clock[2]),0,0);
  if (date.getFullYear()!==Number(match[1]) || date.getMonth()!==Number(match[2])-1 || date.getDate()!==Number(match[3])
    || date.getHours()!==Number(clock[1]) || date.getMinutes()!==Number(clock[2])) return null;
  return date.toISOString();
}
function formatDate(value) {
  try { return new Date(value).toLocaleString([], { weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit' }); }
  catch { return 'Scheduled time unavailable'; }
}

export default function LiveEventsScreen({ navigation }) {
  const { colors, spacing, radii, typography } = useTheme();
  const [events,setEvents]=useState([]);
  const [invitations,setInvitations]=useState([]);
  const [candidates,setCandidates]=useState([]);
  const [selectedInvitees,setSelectedInvitees]=useState([]);
  const [currentUserId,setCurrentUserId]=useState(null);
  const [title,setTitle]=useState('');
  const [description,setDescription]=useState('');
  const [category,setCategory]=useState('social');
  const [visibility,setVisibility]=useState('public');
  const [schedule,setSchedule]=useState(initialSchedule);
  const [duration,setDuration]=useState('60');
  const [capacity,setCapacity]=useState('100');
  const [showComposer,setShowComposer]=useState(false);
  const [loading,setLoading]=useState(true);
  const [loadingContacts,setLoadingContacts]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');

  const refresh=useCallback(async()=>{
    setLoading(true); setError('');
    try {
      const user=await getCurrentUser().catch(()=>null);
      const expectedId=user?.id||null;
      const [eventResult,inviteResult]=await Promise.all([
        backendFetch('/live/events'),
        backendFetch('/live/events/invitations'),
      ]);
      const latest=await getCurrentUser().catch(()=>null);
      if (latest?.id!==expectedId) return;
      setCurrentUserId(expectedId);
      setEvents(Array.isArray(eventResult?.events)?eventResult.events:[]);
      setInvitations(Array.isArray(inviteResult?.invitations)?inviteResult.invitations:[]);
    } catch(e) { setError(e?.message||'LIVE Events are temporarily unavailable.'); }
    finally { setLoading(false); }
  },[]);

  useFocusEffect(useCallback(()=>{ refresh(); },[refresh]));

  const loadCandidates=async()=>{
    setLoadingContacts(true);
    try {
      const result=await backendFetch('/live/invite-candidates');
      setCandidates(Array.isArray(result?.candidates)?result.candidates:[]);
    } catch(e) { showAppAlert('Contacts unavailable',e?.message||'Could not load people from your chats.'); }
    finally { setLoadingContacts(false); }
  };

  const toggleInvitee=(id)=>{
    setSelectedInvitees((current)=>{
      if (current.includes(id)) return current.filter((item)=>item!==id);
      if (current.length>=25) { showAppAlert('Invite limit reached','A private Event can invite up to 25 people at once.'); return current; }
      return [...current,id];
    });
  };

  const createEvent=async()=>{
    const startsAt=toIso(schedule.date,schedule.time);
    const durationMinutes=Number(duration),maxAttendees=Number(capacity);
    if (title.trim().length<3 || title.trim().length>80) return showAppAlert('Add an Event title','Use 3–80 characters so people know what this LIVE Event is about.');
    if (!startsAt || Date.parse(startsAt)<Date.now()+10*60*1000 || Date.parse(startsAt)>Date.now()+90*24*60*60*1000) return showAppAlert('Check the schedule','Choose a valid local date and time at least 10 minutes from now and within 90 days.');
    if (!Number.isInteger(durationMinutes)||durationMinutes<15||durationMinutes>240) return showAppAlert('Check the duration','Choose between 15 and 240 minutes.');
    if (!Number.isInteger(maxAttendees)||maxAttendees<1||maxAttendees>500) return showAppAlert('Check the capacity','Choose between 1 and 500 attendees.');
    if (visibility==='private' && selectedInvitees.length===0) return showAppAlert('Choose invitees','Private Events need at least one person from your existing chats.');
    setBusy(true);
    try {
      const created=await backendFetch('/live/events',{method:'POST',body:JSON.stringify({
        title:title.trim(),description:description.trim(),category,visibility,startsAt,durationMinutes,maxAttendees,
      })});
      if (visibility==='private') {
        try {
          await backendFetch('/live/events/'+encodeURIComponent(created.event.id)+'/invites',{
            method:'POST',body:JSON.stringify({userIds:selectedInvitees}),
          });
        } catch(inviteError) {
          await backendFetch('/live/events/'+encodeURIComponent(created.event.id)+'/cancel',{method:'POST'}).catch(()=>null);
          throw new Error('The Event was not published because invitations could not be delivered. Please try again.');
        }
      }
      setTitle('');setDescription('');setSelectedInvitees([]);setShowComposer(false);setSchedule(initialSchedule());
      showAppAlert('LIVE Event scheduled','Your Event is saved. Invitees have been notified where applicable.');
      await refresh();
    } catch(e) { showAppAlert('Could not schedule Event',e?.message||'Please try again.'); }
    finally { setBusy(false); }
  };

  const respondInvitation=async(eventId,status)=>{
    setBusy(true);
    try { await backendFetch('/live/events/'+encodeURIComponent(eventId)+'/invitation',{method:'PATCH',body:JSON.stringify({status})}); await refresh(); }
    catch(e) { showAppAlert('Invitation not updated',e?.message||'Please try again.'); }
    finally { setBusy(false); }
  };

  const toggleRsvp=async(event)=>{
    setBusy(true);
    try {
      const alreadyGoing=event.rsvpStatus==='going';
      await backendFetch('/live/events/'+encodeURIComponent(event.id)+'/rsvp',{
        method:alreadyGoing?'DELETE':'POST',
      });
      await refresh();
    } catch(e) { showAppAlert('RSVP not updated',e?.message||'Please try again.'); }
    finally { setBusy(false); }
  };

  const cancelEvent=(event)=>{
    Alert.alert('Cancel this LIVE Event?', 'Attendees will no longer be able to RSVP. This cannot be undone.',[
      {text:'Keep Event',style:'cancel'},
      {text:'Cancel Event',style:'destructive',onPress:async()=>{
        setBusy(true);
        try { await backendFetch('/live/events/'+encodeURIComponent(event.id)+'/cancel',{method:'POST'}); await refresh(); }
        catch(e) { showAppAlert('Event not cancelled',e?.message||'Please try again.'); }
        finally { setBusy(false); }
      }},
    ]);
  };

  const fieldStyle={minHeight:48,borderWidth:1,borderColor:colors.border,borderRadius:radii.md,paddingHorizontal:spacing.md,color:colors.textPrimary,backgroundColor:colors.surface};
  const sectionLabel={...typography.caption,color:colors.textSecondary,fontWeight:'900',letterSpacing:1};
  const chip=(selected)=>({minHeight:42,paddingHorizontal:spacing.md,borderRadius:14,borderWidth:1,borderColor:selected?colors.primary:colors.border,backgroundColor:selected?hexToRgba(colors.primary,0.13):colors.surface,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:6});

  return (
    <SafeAreaView style={{flex:1,backgroundColor:colors.background}}>
      <ScrollView contentContainerStyle={{padding:spacing.md,paddingBottom:spacing.xl,gap:spacing.md}} keyboardShouldPersistTaps="handled">
        <View style={{flexDirection:'row',alignItems:'center',gap:spacing.sm}}>
          <TouchableOpacity onPress={()=>navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back" style={{width:44,height:44,borderRadius:15,borderWidth:1,borderColor:colors.border,alignItems:'center',justifyContent:'center'}}>
            <Ionicons name="chevron-back" size={21} color={colors.textPrimary}/>
          </TouchableOpacity>
          <View style={{flex:1}}>
            <Text style={[typography.heading,{color:colors.textPrimary,fontSize:25}]}>LIVE Events</Text>
            <Text style={[typography.caption,{color:colors.textSecondary}]}>Plan a moment. Bring your people together.</Text>
          </View>
          <TouchableOpacity onPress={refresh} accessibilityRole="button" accessibilityLabel="Refresh LIVE Events" style={{width:44,height:44,borderRadius:15,borderWidth:1,borderColor:colors.border,alignItems:'center',justifyContent:'center'}}>
            <Ionicons name="refresh" size={18} color={colors.primary}/>
          </TouchableOpacity>
        </View>

        <GlassCard glow contentStyle={{padding:spacing.md,gap:spacing.sm}}>
          <View style={{flexDirection:'row',alignItems:'center',gap:spacing.sm}}>
            <View style={{width:46,height:46,borderRadius:16,backgroundColor:hexToRgba(colors.primary,0.14),alignItems:'center',justifyContent:'center'}}>
              <Ionicons name="calendar" size={23} color={colors.primary}/>
            </View>
            <View style={{flex:1}}>
              <Text style={[typography.bodyStrong,{color:colors.textPrimary}]}>A stage with a date and a purpose</Text>
              <Text style={[typography.caption,{color:colors.textSecondary}]}>Schedule up to five upcoming Events, with audience controls and capped attendance.</Text>
            </View>
          </View>
          <TouchableOpacity onPress={()=>setShowComposer((v)=>!v)} accessibilityRole="button" accessibilityState={{expanded:showComposer}} style={{minHeight:50,borderRadius:16,backgroundColor:colors.primary,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:8}}>
            <Ionicons name={showComposer?'close':'add-circle-outline'} size={19} color={colors.onPrimary}/>
            <Text style={[typography.bodyStrong,{color:colors.onPrimary}]}>{showComposer?'Close Event setup':'Schedule a LIVE Event'}</Text>
          </TouchableOpacity>
        </GlassCard>

        {showComposer&&<GlassCard contentStyle={{padding:spacing.md,gap:spacing.sm}}>
          <Text style={[typography.bodyStrong,{color:colors.textPrimary,fontSize:17}]}>Event details</Text>
          <TextInput value={title} onChangeText={(v)=>setTitle(v.slice(0,80))} maxLength={80} placeholder="Give your Event a memorable title" placeholderTextColor={colors.textSecondary} accessibilityLabel="LIVE Event title" style={fieldStyle}/>
          <TextInput value={description} onChangeText={(v)=>setDescription(v.slice(0,1000))} maxLength={1000} multiline placeholder="What will people experience?" placeholderTextColor={colors.textSecondary} accessibilityLabel="LIVE Event description" style={[fieldStyle,{minHeight:82,textAlignVertical:'top',paddingTop:12}]}/>
          <Text style={sectionLabel}>CATEGORY</Text>
          <View style={{flexDirection:'row',flexWrap:'wrap',gap:spacing.xs}}>
            {CATEGORIES.map(([value,label])=><TouchableOpacity key={value} onPress={()=>setCategory(value)} accessibilityRole="radio" accessibilityState={{checked:category===value}} style={chip(category===value)}>
              <Text style={[typography.caption,{color:category===value?colors.primary:colors.textSecondary,fontWeight:'800'}]}>{label}</Text>
            </TouchableOpacity>)}
          </View>
          <Text style={sectionLabel}>AUDIENCE</Text>
          <View style={{flexDirection:'row',flexWrap:'wrap',gap:spacing.xs}}>
            {VISIBILITIES.map(([value,label,icon])=><TouchableOpacity key={value} onPress={()=>setVisibility(value)} accessibilityRole="radio" accessibilityState={{checked:visibility===value}} style={chip(visibility===value)}>
              <Ionicons name={icon} size={15} color={visibility===value?colors.primary:colors.textSecondary}/>
              <Text style={[typography.caption,{color:visibility===value?colors.primary:colors.textSecondary,fontWeight:'800'}]}>{label}</Text>
            </TouchableOpacity>)}
          </View>
          {visibility==='private'&&<View style={{gap:spacing.xs}}>
            <TouchableOpacity onPress={loadCandidates} disabled={loadingContacts} accessibilityRole="button" style={{minHeight:46,borderWidth:1,borderColor:colors.border,borderRadius:14,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8}}>
              {loadingContacts?<ActivityIndicator color={colors.primary}/>:<Ionicons name="people-outline" size={18} color={colors.primary}/>}
              <Text style={[typography.caption,{color:colors.primary,fontWeight:'800'}]}>{loadingContacts?'Loading chat contacts…':'Choose private invitees'}</Text>
            </TouchableOpacity>
            <View style={{maxHeight:160}}>
              <ScrollView nestedScrollEnabled>
                {candidates.map((person)=><TouchableOpacity key={person.id} onPress={()=>toggleInvitee(person.id)} accessibilityRole="checkbox" accessibilityState={{checked:selectedInvitees.includes(person.id)}} style={{minHeight:44,flexDirection:'row',alignItems:'center',gap:8,borderBottomWidth:1,borderBottomColor:colors.border}}>
                  <Ionicons name={selectedInvitees.includes(person.id)?'checkbox':'square-outline'} size={19} color={colors.primary}/>
                  <Text numberOfLines={1} style={[typography.body,{color:colors.textPrimary,flex:1}]}>{person.name||'ZannyChat user'}</Text>
                </TouchableOpacity>)}
              </ScrollView>
            </View>
            <Text style={[typography.caption,{color:colors.textSecondary}]}>{selectedInvitees.length} of 25 invitees selected</Text>
          </View>}
          <Text style={sectionLabel}>LOCAL DATE AND TIME</Text>
          <View style={{flexDirection:'row',gap:spacing.xs}}>
            <TextInput value={schedule.date} onChangeText={(date)=>setSchedule((v)=>({...v,date}))} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textSecondary} accessibilityLabel="Event date in local time" style={[fieldStyle,{flex:1}]}/>
            <TextInput value={schedule.time} onChangeText={(time)=>setSchedule((v)=>({...v,time}))} placeholder="HH:mm" placeholderTextColor={colors.textSecondary} accessibilityLabel="Event time in local time" style={[fieldStyle,{width:112}]}/>
          </View>
          <Text style={sectionLabel}>DURATION AND CAPACITY</Text>
          <View style={{flexDirection:'row',gap:spacing.xs}}>
            <TextInput value={duration} onChangeText={setDuration} keyboardType="number-pad" placeholder="Minutes" placeholderTextColor={colors.textSecondary} accessibilityLabel="Event duration in minutes" style={[fieldStyle,{flex:1}]}/>
            <TextInput value={capacity} onChangeText={setCapacity} keyboardType="number-pad" placeholder="Attendees" placeholderTextColor={colors.textSecondary} accessibilityLabel="Maximum attendees" style={[fieldStyle,{flex:1}]}/>
          </View>
          <Text style={[typography.caption,{color:colors.textSecondary}]}>Events can be scheduled 10 minutes to 90 days ahead. Duration: 15–240 minutes. Capacity: 1–500.</Text>
          <TouchableOpacity disabled={busy} onPress={createEvent} accessibilityRole="button" accessibilityState={{disabled:busy,busy}} style={{minHeight:52,borderRadius:16,backgroundColor:busy?colors.border:colors.primary,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:8}}>
            {busy?<ActivityIndicator color={colors.onPrimary}/>:<Ionicons name="calendar-outline" size={19} color={colors.onPrimary}/>}
            <Text style={[typography.bodyStrong,{color:colors.onPrimary}]}>{busy?'Saving Event…':'Schedule Event'}</Text>
          </TouchableOpacity>
        </GlassCard>}

        {invitations.length>0&&<View style={{gap:spacing.sm}}>
          <Text style={[typography.bodyStrong,{color:colors.textPrimary,fontSize:18}]}>Private invitations</Text>
          {invitations.map((event)=><GlassCard key={event.id} contentStyle={{padding:spacing.md,gap:spacing.sm}}>
            <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
              <Ionicons name="lock-closed" size={17} color={colors.primary}/>
              <Text style={[typography.caption,{color:colors.primary,fontWeight:'900'}]}>INVITED BY {event.creator?.name||'A CREATOR'}</Text>
            </View>
            <Text style={[typography.bodyStrong,{color:colors.textPrimary}]}>{event.title}</Text>
            <Text style={[typography.caption,{color:colors.textSecondary}]}>{formatDate(event.startsAt)}</Text>
            <View style={{flexDirection:'row',gap:spacing.xs}}>
              <TouchableOpacity disabled={busy} onPress={()=>respondInvitation(event.id,'accepted')} accessibilityRole="button" style={{flex:1,minHeight:44,borderRadius:13,backgroundColor:colors.primary,alignItems:'center',justifyContent:'center'}}>
                <Text style={[typography.caption,{color:colors.onPrimary,fontWeight:'900'}]}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={busy} onPress={()=>respondInvitation(event.id,'declined')} accessibilityRole="button" style={{flex:1,minHeight:44,borderRadius:13,borderWidth:1,borderColor:colors.border,alignItems:'center',justifyContent:'center'}}>
                <Text style={[typography.caption,{color:colors.textSecondary,fontWeight:'900'}]}>Decline</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>)}
        </View>}

        <View style={{gap:spacing.sm}}>
          <Text style={[typography.bodyStrong,{color:colors.textPrimary,fontSize:18}]}>Upcoming in your community</Text>
          {loading&&<ActivityIndicator color={colors.primary} style={{marginVertical:spacing.md}}/>}
          {!!error&&<Text accessibilityRole="alert" style={[typography.caption,{color:colors.danger}]}>{error}</Text>}
          {!loading&&!error&&events.length===0&&<GlassCard contentStyle={{padding:spacing.lg,alignItems:'center',gap:spacing.sm}}>
            <Ionicons name="calendar-clear-outline" size={30} color={colors.primary}/>
            <Text style={[typography.bodyStrong,{color:colors.textPrimary}]}>No upcoming Events yet</Text>
            <Text style={[typography.caption,{color:colors.textSecondary,textAlign:'center'}]}>Schedule a LIVE Event or follow creators to discover their next gathering.</Text>
          </GlassCard>}
          {events.map((event)=><GlassCard key={event.id} contentStyle={{padding:spacing.md,gap:spacing.sm}}>
            <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:spacing.sm}}>
              <Text style={[typography.caption,{color:colors.primary,fontWeight:'900',letterSpacing:0.8}]}>{event.category.toUpperCase()} · {event.visibility.toUpperCase()}</Text>
              <Text style={[typography.caption,{color:colors.textSecondary}]}>{event.attendeeCount}/{event.maxAttendees} going</Text>
            </View>
            <Text style={[typography.bodyStrong,{color:colors.textPrimary,fontSize:17}]}>{event.title}</Text>
            {!!event.description&&<Text style={[typography.caption,{color:colors.textSecondary,lineHeight:19}]}>{event.description}</Text>}
            <View style={{flexDirection:'row',alignItems:'center',gap:7}}>
              <Ionicons name="time-outline" size={16} color={colors.primary}/>
              <Text style={[typography.caption,{color:colors.textSecondary}]}>{formatDate(event.startsAt)} · {event.durationMinutes} min</Text>
            </View>
            <Text style={[typography.caption,{color:colors.textSecondary}]}>Hosted by {event.creator?.name||'LIVE Creator'}</Text>
            {event.creatorId===currentUserId
              ? <TouchableOpacity disabled={busy} onPress={()=>cancelEvent(event)} accessibilityRole="button" style={{minHeight:42,borderWidth:1,borderColor:colors.danger,borderRadius:13,alignItems:'center',justifyContent:'center'}}>
                  <Text style={[typography.caption,{color:colors.danger,fontWeight:'900'}]}>Cancel Event</Text>
                </TouchableOpacity>
              : <TouchableOpacity disabled={busy||event.rsvpStatus==='going'||event.attendeeCount>=event.maxAttendees} onPress={()=>toggleRsvp(event)} accessibilityRole="button" accessibilityState={{disabled:busy||event.rsvpStatus==='going'||event.attendeeCount>=event.maxAttendees}} style={{minHeight:44,borderRadius:13,backgroundColor:event.rsvpStatus==='going'?colors.surface:colors.primary,borderWidth:event.rsvpStatus==='going'?1:0,borderColor:colors.border,alignItems:'center',justifyContent:'center'}}>
                  <Text style={[typography.caption,{color:event.rsvpStatus==='going'?colors.textSecondary:colors.onPrimary,fontWeight:'900'}]}>{event.rsvpStatus==='going'?'You are going':event.attendeeCount>=event.maxAttendees?'Event full':'Reserve my place'}</Text>
                </TouchableOpacity>}
          </GlassCard>)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
