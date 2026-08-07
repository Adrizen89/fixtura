import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'event_stream': { paramsTuple?: []; params?: {} }
    'subscribe': { paramsTuple?: []; params?: {} }
    'unsubscribe': { paramsTuple?: []; params?: {} }
    'public.tournament': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'login.show': { paramsTuple?: []; params?: {} }
    'login': { paramsTuple?: []; params?: {} }
    'logout': { paramsTuple?: []; params?: {} }
    'tournaments.index': { paramsTuple?: []; params?: {} }
    'tournaments.create': { paramsTuple?: []; params?: {} }
    'tournaments.store': { paramsTuple?: []; params?: {} }
    'tournaments.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tournaments.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tournaments.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tournaments.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tournaments.teams.store': { paramsTuple: [ParamValue]; params: {'tournament_id': ParamValue} }
    'tournaments.teams.update': { paramsTuple: [ParamValue,ParamValue]; params: {'tournament_id': ParamValue,'id': ParamValue} }
    'tournaments.teams.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'tournament_id': ParamValue,'id': ParamValue} }
    'tournaments.planning.preview': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tournaments.planning.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tournaments.results': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tournaments.matches.update': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'matchId': ParamValue} }
    'tournaments.matches.reschedule': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'matchId': ParamValue} }
    'tournaments.matches.forfeit': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'matchId': ParamValue} }
  }
  GET: {
    'event_stream': { paramsTuple?: []; params?: {} }
    'public.tournament': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'login.show': { paramsTuple?: []; params?: {} }
    'tournaments.index': { paramsTuple?: []; params?: {} }
    'tournaments.create': { paramsTuple?: []; params?: {} }
    'tournaments.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tournaments.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tournaments.planning.preview': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tournaments.results': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  HEAD: {
    'event_stream': { paramsTuple?: []; params?: {} }
    'public.tournament': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'login.show': { paramsTuple?: []; params?: {} }
    'tournaments.index': { paramsTuple?: []; params?: {} }
    'tournaments.create': { paramsTuple?: []; params?: {} }
    'tournaments.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tournaments.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tournaments.planning.preview': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tournaments.results': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  POST: {
    'subscribe': { paramsTuple?: []; params?: {} }
    'unsubscribe': { paramsTuple?: []; params?: {} }
    'login': { paramsTuple?: []; params?: {} }
    'logout': { paramsTuple?: []; params?: {} }
    'tournaments.store': { paramsTuple?: []; params?: {} }
    'tournaments.teams.store': { paramsTuple: [ParamValue]; params: {'tournament_id': ParamValue} }
    'tournaments.planning.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  PUT: {
    'tournaments.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tournaments.teams.update': { paramsTuple: [ParamValue,ParamValue]; params: {'tournament_id': ParamValue,'id': ParamValue} }
  }
  PATCH: {
    'tournaments.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tournaments.teams.update': { paramsTuple: [ParamValue,ParamValue]; params: {'tournament_id': ParamValue,'id': ParamValue} }
    'tournaments.matches.update': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'matchId': ParamValue} }
    'tournaments.matches.reschedule': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'matchId': ParamValue} }
    'tournaments.matches.forfeit': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'matchId': ParamValue} }
  }
  DELETE: {
    'tournaments.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tournaments.teams.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'tournament_id': ParamValue,'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}