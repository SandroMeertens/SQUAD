/** Visuele interpolatie: serverpositie en teamregels blijven onaangeraakt. */
export function createViewSmoother(){
  const shown=new Map();let cargo=null,activeTeam=null;
  function smoothCoordinate(prev,goal,alpha){
    if(!Number.isFinite(prev)||!Number.isFinite(goal)||Math.abs(goal-prev)>8)return goal;
    return prev+(goal-prev)*alpha;
  }
  return {
    smooth(state,id,elapsedMs=33){
      if(!state?.players)return state;
      const alpha=1-Math.exp(-Math.max(0,Math.min(120,elapsedMs))*.014);
      const players={...state.players};
      for(const [uid,p] of Object.entries(state.players)){
        if(!Number.isFinite(p?.x)||!Number.isFinite(p?.z))continue;
        const last=shown.get(uid);
        const x=smoothCoordinate(last?.x,p.x,alpha),z=smoothCoordinate(last?.z,p.z,alpha);
        shown.set(uid,{x,z});
        players[uid]={...p,x,z};
      }
      for(const uid of shown.keys())if(!(uid in state.players))shown.delete(uid);
      const mine=state.players[id],teamIndex=mine?.team;
      const source=state.teams?.[teamIndex];
      if(teamIndex!==activeTeam){activeTeam=teamIndex;cargo=null;}
      if(!source?.couch)return {...state,players};
      const target=source.couch;
      const x=smoothCoordinate(cargo?.x,target.x,alpha),z=smoothCoordinate(cargo?.z,target.z,alpha);
      cargo={x,z};
      const teams=state.teams.slice();
      teams[teamIndex]={...source,couch:{...target,x,z}};
      return {...state,players,teams};
    },
    reset(){shown.clear();cargo=null;activeTeam=null;}
  };
}
