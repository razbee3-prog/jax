import {FAULT_IDS,type FaultId} from "../../shared/faults";

export const FAULT_LANGUAGE:Record<FaultId,{claim:string;mention:string}>={
  rdl_back_round:{claim:"back round|round(?:ed|ing) (?:your |the )?back|spine round|(?:back|spine) (?:curved|lost its straight line)",mention:"back round|round(?:ed|ing) (?:your |the )?back|spine round"},
  rdl_knee_squat:{claim:"too much knee bend|knees? bend(?:ing)? too (?:much|deep)|squatt?ing (?:the |your )?(?:hinge|deadlift)|knees? (?:bent|bend|bending)[^.!?]{0,45}(?:more than|too much|too deep)|(?:hinge|deadlift)[^.!?]{0,25}(?:squat|excess knee bend)",mention:"too much knee bend|knees? bend(?:ing)? too (?:much|deep)|squatt?ing (?:the |your )?(?:hinge|deadlift)|knees? nearly straight"},
  rdl_drift:{claim:"(?:weights?|dumbbells?) (?:drift|too far|away from)|(?:weights?|dumbbells?)[^.!?]{0,30}(?:drifted|moved away|wandered)[^.!?]{0,25}(?:legs|shins|track)?",mention:"(?:weights?|dumbbells?) (?:drift|too far|away from)|(?:weights?|dumbbells?) close to (?:your |the )?(?:legs|shins)"},
  rdl_shallow:{claim:"shallow hinge|hinge (?:was |is )?too short|hinge[^.!?]{0,25}(?:stopped short|ended early|too shallow)",mention:"shallow hinge|hinge (?:was |is )?too short|hips? farther back|hips? further back"},
  rdl_fast:{claim:"(?:hinge|deadlift|lowering) too (?:fast|quick)|rush(?:ed|ing) (?:the |your )?(?:hinge|deadlift)|(?:hinge|deadlift)[^.!?]{0,25}(?:rushed|sped up)|lowering phase[^.!?]{0,25}(?:rushed|too quick)",mention:"(?:hinge|deadlift|lowering) too (?:fast|quick)|rush(?:ed|ing) (?:the |your )?(?:hinge|deadlift)|slow (?:the |your )?lowering"},
  pp_chest_forward:{claim:"chest (?:tip|fall|lean)(?:ped|ing|s)? forward|chest[^.!?]{0,18}(?:tipped|tilted|fell|leaned) forward",mention:"chest (?:tip|fall|lean)(?:ped|ing|s)? forward|chest up(?:right)?"},
  pp_dip_deep:{claim:"dip (?:was |is )?too deep|dip (?:a little |too )?deep|dip[^.!?]{0,25}(?:deeper than|went too low|exceeded[^.!?]{0,12}depth)",mention:"dip (?:was |is )?too deep|dip (?:a little |too )?deep|smaller dip|shorter dip"},
  pp_no_legs:{claim:"no leg drive|not using (?:your |the )?legs|(?:leg drive|leg push)[^.!?]{0,25}(?:missing|absent|not there)|(?:legs|leg drive)[^.!?]{0,20}(?:did not|didn't) help",mention:"no leg drive|not using (?:your |the )?legs|use (?:the |your )?legs to|drive (?:the |your )?floor"},
  pp_soft_lockout:{claim:"soft lockout|incomplete lockout|(?:press|lockout)[^.!?]{0,25}(?:stopped short|unfinished)|(?:elbows|arms)[^.!?]{0,20}(?:stayed bent|not fully extended)",mention:"soft lockout|incomplete lockout|finish (?:the )?press|reach (?:the )?weights? (?:higher|up)"},
  pp_lean_back:{claim:"lean(?:ed|ing)? (?:too far )?back|back (?:was |is )?arch(?:ed|ing)|(?:torso|body)[^.!?]{0,18}leaned back|back[^.!?]{0,15}overarched",mention:"lean(?:ed|ing)? (?:too far )?back|back (?:was |is )?arch(?:ed|ing)"},
  pp_press_early:{claim:"press(?:ed|ing)? too early|arms? start(?:ed|ing)? before|(?:press|arms)[^.!?]{0,25}(?:before the legs|ahead of the legs|before leg drive)",mention:"press(?:ed|ing)? too early|arms? start(?:ed|ing)? before|legs? (?:first|then arms)"},
  curl_swing:{claim:"(?:body|torso|hips?) (?:was |is )?swing|swing(?:ing)? (?:your |the )?(?:body|torso|hips)|(?:body|torso|hips)[^.!?]{0,18}(?:rocked|swayed)|momentum[^.!?]{0,18}(?:curl|weights)",mention:"(?:body|torso|hips?) (?:was |is )?swing|swing(?:ing)? (?:your |the )?(?:body|torso|hips)|body still|torso still"},
  curl_elbow_drift:{claim:"elbows? (?:drift|mov|travel)|elbows?[^.!?]{0,18}(?:wandered|slid forward|crept forward)",mention:"elbows? (?:drift|mov|travel)|elbows? (?:stay |close |by |beside |quiet)"},
  curl_partial:{claim:"partial curls?|incomplete curls?|short curl|curls?[^.!?]{0,25}(?:stopped short|cut short|missed[^.!?]{0,12}range)|curl range[^.!?]{0,18}(?:short|incomplete)",mention:"partial curls?|incomplete curls?|short curl|finish (?:the |your )?curl|full curl|all the way (?:up|down)"},
  curl_drop:{claim:"drop(?:ped|ping)? (?:the |your )?weights?|curl lowering too fast|(?:curl return|curl descent|lowering phase)[^.!?]{0,30}(?:dropped|came down quickly|fell|too fast)",mention:"drop(?:ped|ping)? (?:the |your )?weights?|curl lowering too fast|lower (?:the |your )?weights? slowly"},
  pu_hip_sag:{claim:"hips? (?:was |is |were )?sag|sagg?ing hips?|hips? (?:too |hanging )?low|hips?[^.!?]{0,18}(?:dipped|sank|sagged) (?:below|toward|on)",mention:"hips? (?:was |is |were )?sag|sagg?ing hips?|hips? (?:too |hanging )?low"},
  pu_hip_pike:{claim:"hips? (?:was |is |were )?(?:pik|too high)|pik(?:ed|ing) hips?|hips?[^.!?]{0,18}(?:rose|lifted) (?:above|too high)|hips?[^.!?]{0,18}higher than",mention:"hips? (?:was |is |were )?(?:pik|too high)|pik(?:ed|ing) hips?|hips? lower"},
  pu_shallow:{claim:"shallow push.?ups?|push.?ups? (?:was |were )?too shallow|push.?ups?[^.!?]{0,22}(?:stopped short|missed[^.!?]{0,12}depth)|chest[^.!?]{0,25}(?:stopped too high|did not reach[^.!?]{0,12}floor)",mention:"shallow push.?ups?|push.?ups? (?:was |were )?too shallow|chest closer to (?:the )?floor"},
  pu_head_drop:{claim:"head (?:was |is )?drop|neck (?:was |is )?drop|drop(?:ped|ping)? (?:your |the )?head|(?:head|chin)[^.!?]{0,18}(?:dipped|hung|fell) (?:toward|below)|neck[^.!?]{0,18}lost its line",mention:"head (?:was |is )?drop|neck (?:was |is )?drop|drop(?:ped|ping)? (?:your |the )?head"},
};
export function claimedFaults(text:string):FaultId[]{
  return FAULT_IDS.filter(id=>text.toLowerCase().includes(id) || new RegExp(FAULT_LANGUAGE[id].claim,"iu").test(text));
}
export function namedFaults(text:string):FaultId[]{
  return FAULT_IDS.filter(id=>text.toLowerCase().includes(id) || new RegExp(`${FAULT_LANGUAGE[id].claim}|${FAULT_LANGUAGE[id].mention}`,"iu").test(text));
}
