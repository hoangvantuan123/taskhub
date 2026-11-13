package main

import (
	"fmt"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	h, err := bcrypt.GenerateFromPassword([]byte("Admin@123"), 12)
	if err != nil {
		panic(err)
	}
	fmt.Println(string(h))
}

