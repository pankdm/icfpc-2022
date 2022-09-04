// @ts-noscheck
import _ from 'lodash'
import { atom } from 'nanostores'
import { useStore } from '@nanostores/react'

export const persistedState = atom({})

export function getEntireAppState() {
    return persistedState.get()
}
function loadState() {
    const state = sessionStorage.icfpc ? JSON.parse(sessionStorage.icfpc) : {}
    persistedState.set(state)
    return state
}
export function setEntireAppState(state) {
    persistedState.set(state)
    sessionStorage.setItem('icfpc', JSON.stringify(state))
}
loadState()

export function updateEntireAppState(update) {
    return setEntireAppState(_.merge({}, persistedState.get(), update))
}

export function getAppState(key) {
    return _.get(getEntireAppState(), key)
}

export function setAppState(key, newState) {
    const _copyState = _.cloneDeep(persistedState.get())
    const _update = newState
    const _newState = _.set(_copyState, key, _update)
    return setEntireAppState(_newState)
}

export function updateAppState(key, update) {
    const _update = _.set({}, key, update)
    const _newState = _.merge({}, persistedState.get(), _.set({}, key, update))
    return setEntireAppState(_newState)
}

export function useAppState(key): [any, Function] {
    if (!key) {
        throw new Error('useAppState() needs a store item key')
    }
    useStore(persistedState)
    const state = key === 'ROOT' ? getEntireAppState() : getAppState(key)
    const setState = (newState) => {
        if (key === 'ROOT') {
            updateEntireAppState(newState)
        } else {
            updateAppState(key, newState)
        }
    }
    return [state, setState]
}
