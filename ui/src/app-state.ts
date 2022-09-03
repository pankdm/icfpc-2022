// @ts-noscheck
import _ from 'lodash'
import { atom } from 'nanostores'
import { useStore } from '@nanostores/react'

export const persistedState = atom({})

export function getAppState() {
    return persistedState.get()
}
function loadState() {
    const state = sessionStorage.icfpc ? JSON.parse(sessionStorage.icfpc) : {}
    persistedState.set(state)
    return state
}
export function setAppState(state) {
    persistedState.set(state)
    sessionStorage.setItem('icfpc', JSON.stringify(state))
}
loadState()

export function useAppState(key): [any, Function] {
    if (!key) {
        throw new Error('useAppState() needs a store item key')
    }
    const wholeAppState = useStore(persistedState)
    const state = key === 'ROOT' ? wholeAppState : _.get(wholeAppState, key)
    const setState = (newState) => {
        const update = key === 'ROOT' ? newState : _.set({}, key, newState)
        const _newState = { ...persistedState.get(), ...update }
        setAppState(_newState)
    }
    return [state, setState]
}

window.setAppState = setAppState
