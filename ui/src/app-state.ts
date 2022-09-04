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
    return getEntireAppState()[key]
}

export function setAppState(key, newState) {
    return setEntireAppState({...persistedState.get(), [key]: newState})
}

export function updateAppState(key, update) {
    return setEntireAppState(_.merge({}, persistedState.get(), { [key]: update }))
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

window.setEntireAppState = setEntireAppState
