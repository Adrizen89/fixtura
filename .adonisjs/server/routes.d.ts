import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'event_stream': { paramsTuple?: []; params?: {} }
    'subscribe': { paramsTuple?: []; params?: {} }
    'unsubscribe': { paramsTuple?: []; params?: {} }
    'public.tournament': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'public.event': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'login.show': { paramsTuple?: []; params?: {} }
    'login': { paramsTuple?: []; params?: {} }
    'logout': { paramsTuple?: []; params?: {} }
    'events.index': { paramsTuple?: []; params?: {} }
    'events.create': { paramsTuple?: []; params?: {} }
    'events.store': { paramsTuple?: []; params?: {} }
    'events.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'events.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'events.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'events.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'events.categories.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'events.categories.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'categoryId': ParamValue} }
    'events.planning.preview': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'events.planning.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
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
    'public.event': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'login.show': { paramsTuple?: []; params?: {} }
    'events.index': { paramsTuple?: []; params?: {} }
    'events.create': { paramsTuple?: []; params?: {} }
    'events.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'events.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'events.planning.preview': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
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
    'public.event': { paramsTuple: [ParamValue]; params: {'slug': ParamValue} }
    'login.show': { paramsTuple?: []; params?: {} }
    'events.index': { paramsTuple?: []; params?: {} }
    'events.create': { paramsTuple?: []; params?: {} }
    'events.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'events.edit': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'events.planning.preview': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
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
    'events.store': { paramsTuple?: []; params?: {} }
    'events.categories.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'events.planning.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tournaments.store': { paramsTuple?: []; params?: {} }
    'tournaments.teams.store': { paramsTuple: [ParamValue]; params: {'tournament_id': ParamValue} }
    'tournaments.planning.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  PUT: {
    'events.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tournaments.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tournaments.teams.update': { paramsTuple: [ParamValue,ParamValue]; params: {'tournament_id': ParamValue,'id': ParamValue} }
  }
  PATCH: {
    'events.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tournaments.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tournaments.teams.update': { paramsTuple: [ParamValue,ParamValue]; params: {'tournament_id': ParamValue,'id': ParamValue} }
    'tournaments.matches.update': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'matchId': ParamValue} }
    'tournaments.matches.reschedule': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'matchId': ParamValue} }
    'tournaments.matches.forfeit': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'matchId': ParamValue} }
  }
  DELETE: {
    'events.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'events.categories.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'id': ParamValue,'categoryId': ParamValue} }
    'tournaments.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tournaments.teams.destroy': { paramsTuple: [ParamValue,ParamValue]; params: {'tournament_id': ParamValue,'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}